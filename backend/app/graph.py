import os
import poplib
import joblib
import pandas as pd
import numpy as np
import networkx as nx
from datetime import datetime
from sqlalchemy.orm import Session
from .database import Node, Edge, GroundTruth

class GraphManager:
    def __init__(self):
        self.G = nx.Graph()
        self.risk_model_data = None
        self.link_model_data = None
        self.anomaly_model_data = None
        self.community_cache = None
        self.link_cache = None
        
        self.node_features_cache = {}
        self.models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
        
    def load_models(self):
        print("Loading trained machine learning models...")
        try:
            risk_path = os.path.join(self.models_dir, 'risk_model.joblib')
            if os.path.exists(risk_path):
                self.risk_model_data = joblib.load(risk_path)
                print("  Loaded risk-scoring model successfully.")
            else:
                print("  [Warning] risk_model.joblib not found. Run train.py first.")
                
            link_path = os.path.join(self.models_dir, 'link_model.joblib')
            if os.path.exists(link_path):
                self.link_model_data = joblib.load(link_path)
                print("  Loaded link prediction model successfully.")
            else:
                print("  [Warning] link_model.joblib not found. Run train.py first.")
                
            anomaly_path = os.path.join(self.models_dir, 'anomaly_model.joblib')
            if os.path.exists(anomaly_path):
                self.anomaly_model_data = joblib.load(anomaly_path)
                print("  Loaded anomaly detection model successfully.")
            else:
                print("  [Warning] anomaly_model.joblib not found. Run train.py first.")
        except Exception as e:
            print(f"Error loading models: {e}")

    def load_graph_from_db(self, db: Session):
        print("Loading graph data from database...")
        self.G.clear()
        
        nodes = db.query(Node).all()
        edges = db.query(Edge).all()
        
        # Add nodes
        for n in nodes:
            self.G.add_node(
                n.id, 
                type=n.type, 
                label=n.label,
                occupation=n.attributes.get("occupation", "N/A"),
                age_band=n.attributes.get("age_band", "N/A"),
                prior_cases=n.attributes.get("prior_cases", 0)
            )
            
        # Add edges
        for e in edges:
            if self.G.has_edge(e.source, e.target):
                self.G[e.source][e.target]['weight'] = self.G[e.source][e.target].get('weight', 1.0) + 1.0
            else:
                self.G.add_edge(e.source, e.target, weight=1.0, type=e.type, id=e.id, **e.attributes)
                
        print(f"Graph loaded in memory: {self.G.number_of_nodes()} nodes, {self.G.number_of_edges()} edges.")
        self.recompute_structural_features()

    def recompute_structural_features(self):
        if self.G.number_of_nodes() == 0:
            self.node_features_cache = {}
            return
            
        print("Computing structural features...")
        deg_cent = nx.degree_centrality(self.G)
        
        try:
            pagerank = nx.pagerank(self.G, alpha=0.85)
        except:
            pagerank = deg_cent
            
        if self.G.number_of_nodes() > 1000:
            bet_cent = nx.betweenness_centrality(
                self.G,
                k=250,
                seed=42,
            )
        else:
            bet_cent = nx.betweenness_centrality(self.G)
        cl_cent = nx.closeness_centrality(self.G)
        
        try:
            eig_cent = nx.eigenvector_centrality(self.G, max_iter=2000, tol=1e-05)
        except:
            eig_cent = {node: 0.0 for node in self.G.nodes()}
            
        clust_coeff = nx.clustering(self.G)
        
        # Remove self-loops for k-core
        G_simple = self.G.copy()
        G_simple.remove_edges_from(nx.selfloop_edges(G_simple))
        k_core = nx.core_number(G_simple)
        
        for node in self.G.nodes():
            self.node_features_cache[node] = {
                "degree_centrality": deg_cent.get(node, 0.0),
                "pagerank": pagerank.get(node, 0.0),
                "betweenness_centrality": bet_cent.get(node, 0.0),
                "closeness_centrality": cl_cent.get(node, 0.0),
                "eigenvector_centrality": eig_cent.get(node, 0.0),
                "clustering_coefficient": clust_coeff.get(node, 0.0),
                "k_core_number": k_core.get(node, 0)
            }

    def _prepare_node_feature_vector(self, node_id, node_attrs):
        if self.risk_model_data is None:
            return None
            
        feature_cols = self.risk_model_data['feature_cols']
        
        # Initialize feature dictionary with zeros
        feat_dict = {col: 0.0 for col in feature_cols}
        
        # Add structural features from cache
        struct_feats = self.node_features_cache.get(node_id, {})
        for k, v in struct_feats.items():
            if k in feat_dict:
                feat_dict[k] = float(v)
                
        # Add numerical attributes
        prior_cases = float(node_attrs.get("prior_cases", 0.0))
        if "prior_cases" in feat_dict:
            feat_dict["prior_cases"] = prior_cases
            
        # One-hot categorical attributes
        node_type = node_attrs.get("type", "Person")
        occupation = node_attrs.get("occupation", "N/A")
        age_band = node_attrs.get("age_band", "N/A")
        
        # Set matching categories
        type_col = f"type_{node_type}"
        occ_col = f"occupation_{occupation}"
        age_col = f"age_band_{age_band}"
        
        if type_col in feat_dict:
            feat_dict[type_col] = 1.0
        if occ_col in feat_dict:
            feat_dict[occ_col] = 1.0
        if age_col in feat_dict:
            feat_dict[age_col] = 1.0
            
        # Convert to list matching exactly column names & ordering
        return [feat_dict[col] for col in feature_cols]

    def get_risk_score(self, node_id):
        if self.risk_model_data is None:
            return 0.0
            
        if node_id not in self.G:
            return 0.0
            
        node_attrs = self.G.nodes[node_id]
        X_list = self._prepare_node_feature_vector(node_id, node_attrs)
        
        if X_list is None:
            return 0.0
            
        # Predict probability of being criminal
        try:
            model = self.risk_model_data['model']
            prob = model.predict_proba(X_list)
            return float(prob)
        except Exception as e:
            print(f"Error predicting risk for node {node_id}: {e}")
            return 0.0

    def get_risk_explanation(self, node_id):
        if self.risk_model_data is None:
            return []
            
        if node_id not in self.G:
            return []
            
        node_attrs = self.G.nodes[node_id]
        X_list = self._prepare_node_feature_vector(node_id, node_attrs)
        
        if X_list is None:
            return []
            
        try:
            model = self.risk_model_data['model']
            feature_cols = self.risk_model_data['feature_cols']
            raw_explanation = model.explain(X_list, feature_cols)
            
            explanation = []
            for item in raw_explanation:
                col = item["feature"]
                val = item["shap_value"]
                pretty_name = col.replace("_centrality", "").replace("_coefficient", "").replace("_number", "").replace("type_", "Type: ").replace("occupation_", "Occ: ").replace("age_band_", "Age: ")
                explanation.append({
                    "feature": pretty_name,
                    "raw_feature": col,
                    "shap_value": float(val)
                })
                    
            explanation.sort(key=lambda x: abs(x['shap_value']), reverse=True)
            return explanation[:6]  
        except Exception as e:
            print(f"Error generating explanation for node {node_id}: {e}")
            return []

    def get_link_probability(self, u, v):
        if self.link_model_data is None:
            return 0.0
            
        if u not in self.G or v not in self.G:
            return 0.0
            
        try:
            node_features_dict = {}
            for node in [u, v]:
                node_features_dict[node] = {**self.G.nodes[node], **self.node_features_cache.get(node, {})}
                

            cn = list(nx.common_neighbors(self.G, u, v))
            num_cn = len(cn)
            
            union_size = len(set(self.G.neighbors(u)).union(set(self.G.neighbors(v))))
            jaccard = num_cn / union_size if union_size > 0 else 0.0
            
            pref_attach = self.G.degree(u) * self.G.degree(v)
            
            adamic_adar = 0.0
            for w in cn:
                deg = self.G.degree(w)
                if deg > 1:
                    adamic_adar += 1.0 / np.log(deg)
                    
            feat_pair = {
                "common_neighbors": num_cn,
                "jaccard_coefficient": jaccard,
                "preferential_attachment": pref_attach,
                "adamic_adar_index": adamic_adar,
            }
            
            # Add src and dst centralities
            for k in ["degree_centrality", "pagerank", "betweenness_centrality", "closeness_centrality", "eigenvector_centrality", "clustering_coefficient", "k_core_number"]:
                feat_pair[f"src_{k}"] = node_features_dict[u].get(k, 0.0)
                feat_pair[f"dst_{k}"] = node_features_dict[v].get(k, 0.0)
                
            # Construct row list
            feature_cols = self.link_model_data['feature_cols']
            feat_row = {col: feat_pair.get(col, 0.0) for col in feature_cols}
            feat_list = [feat_row[col] for col in feature_cols]
            
            model = self.link_model_data['model']
            prob = model.predict_proba(feat_list)
            return float(prob)
        except Exception as e:
            print(f"Error predicting link between {u} and {v}: {e}")
            return 0.0

    def get_link_prediction(self, u, v):
        return self.get_link_probability(u, v)

    def add_case_live(self, new_nodes_data, new_edges_data, db: Session):
        print("Inserting new case elements...")
        
        # 1. Insert Nodes in DB and G
        added_nodes = []
        for n_data in new_nodes_data:
            node_id = n_data["id"]
            node_type = n_data["type"]
            node_label = n_data["label"]
            attrs = n_data.get("attributes", {})
            
            # Check if exists in DB, otherwise add
            db_node = db.query(Node).filter(Node.id == node_id).first()
            if not db_node:
                db_node = Node(id=node_id, type=node_type, label=node_label, attributes=attrs)
                db.add(db_node)
                db.flush() # Flush node to prevent foreign key violations in other tables
                
                # Also create a default normal ground truth record
                db_gt = GroundTruth(node_id=node_id, is_criminal=False, role="normal")
                db.add(db_gt)
                db.flush() # Flush ground truth record
                
            # Add to NetworkX
            self.G.add_node(
                node_id, 
                type=node_type, 
                label=node_label,
                occupation=attrs.get("occupation", "N/A"),
                age_band=attrs.get("age_band", "N/A"),
                prior_cases=attrs.get("prior_cases", 0)
            )
            added_nodes.append(node_id)
            
        db.flush()
            
        for e_data in new_edges_data:
            source = e_data["source"]
            target = e_data["target"]
            edge_type = e_data["type"]
            attrs = e_data.get("attributes", {})
            
            db_edge = Edge(
                source=source,
                target=target,
                type=edge_type,
                attributes=attrs,
                timestamp=datetime.utcnow()
            )
            db.add(db_edge)
            db.commit()
            
            if self.G.has_edge(source, target):
                self.G[source][target]['weight'] = self.G[source][target].get('weight', 1.0) + 1.0
            else:
                self.G.add_edge(source, target, weight=1.0, type=edge_type, id=db_edge.id, **attrs)
                
        db.commit()
        
       
        self.recompute_structural_features()
        
        affected_nodes = set(added_nodes)
        for n_id in added_nodes:
            affected_nodes.update(self.G.neighbors(n_id))
            
        results = {}
        for n_id in affected_nodes:
            results[n_id] = {
                "risk_score": self.get_risk_score(n_id),
                "centrality": self.node_features_cache.get(n_id, {}).get("degree_centrality", 0.0)
            }
        return results

graph_manager = GraphManager()
