import os
import secrets
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Depends, HTTPException, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import networkx as nx

from .database import get_db, init_db, Node as DBNode, Edge as DBEdge, Case as DBCase, GroundTruth
from .graph import graph_manager
from .case_store import case_store
from .routers import cases, upload

app = FastAPI(
    title="SIH26189 — AI-Powered Criminal Network Analysis System API",
    description="Backend services for analyzing multi-source criminal entities, cells, link predictions, heatmaps, and anomalies.",
    version="1.0.0"
)

api_key = os.environ.get("API_KEY", "").strip()
if len(api_key) < 32 or api_key in {"replace-with-a-random-api-key", "change-me"}:
    raise RuntimeError("API_KEY must be a non-default value of at least 32 characters")

public_paths = {"/", "/health"}

@app.middleware("http")
async def require_api_key(request: Request, call_next):
    if request.method == "OPTIONS" or request.url.path in public_paths:
        return await call_next(request)

    if request.url.path not in public_paths:
        supplied_key = request.headers.get("X-API-Key", "")
        if not supplied_key or not secrets.compare_digest(supplied_key, api_key):
            return JSONResponse(status_code=401, content={"detail": "A valid X-API-Key header is required"})
    return await call_next(request)

allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases.router)
app.include_router(upload.router)

class NodeInputSchema(BaseModel):
    id: str
    type: str
    label: str
    attributes: Optional[Dict[str, Any]] = None

class EdgeInputSchema(BaseModel):
    source: str
    target: str
    type: str
    attributes: Optional[Dict[str, Any]] = None

class CaseInputSchema(BaseModel):
    case_id: str
    description: Optional[str] = None
    nodes: List[NodeInputSchema]
    edges: List[EdgeInputSchema]

def refresh_graph_if_needed(db: Session):
    node_count = db.query(DBNode.id).count()
    edge_count = db.query(DBEdge.id).count()
    graph_size = graph_manager.G.number_of_nodes()
    edge_size = graph_manager.G.number_of_edges()

    if graph_size == 0 and node_count > 0:
        print(f"Refreshing graph cache: in-memory {graph_size} nodes/{edge_size} edges vs DB {node_count} nodes/{edge_count} edges.")
        graph_manager.load_graph_from_db(db)
    elif graph_size != node_count or edge_size != edge_count:
        print(f"Refreshing stale graph cache: in-memory {graph_size} nodes/{edge_size} edges vs DB {node_count} nodes/{edge_count} edges.")
        graph_manager.load_graph_from_db(db)

# Startup Event to initialize DB and load graph/models
@app.on_event("startup")
def startup_event():
    # Initialize DB tables
    init_db()
    
    # Load model artifacts
    graph_manager.load_models()
    
    # Pre-cache SIH26189 demo case for sub-second startup response
    try:
        case_store.load_sample_dataset()
        print("SIH26189 Sample dataset pre-cached and ready.")
    except Exception as e:
        print(f"Warning: Failed to pre-load sample dataset: {e}")

@app.get("/")
def read_root():
    return {"message": "Criminal Network Analysis System API is running."}


@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/network")
def get_network(db: Session = Depends(get_db)):
    refresh_graph_if_needed(db)
    # 1. Compute Louvain communities on the fly or get cached ones
    G = graph_manager.G
    if G.number_of_nodes() == 0:
        return {"nodes": [], "edges": []}
        
    try:
        communities = list(nx.community.louvain_communities(G, weight='weight', seed=42))
        community_map = {}
        for comm_idx, node_set in enumerate(communities):
            for node in node_set:
                community_map[node] = comm_idx
    except Exception as e:
        print(f"Louvain communities failed: {e}")
        community_map = {node: 0 for node in G.nodes()}

    # 2. Package nodes
    nodes_data = []
    for node_id, attrs in G.nodes(data=True):
        risk_score = graph_manager.get_risk_score(node_id)
        
        # Check if they are criminal in ground truth (for label visualization if needed)
        gt = db.query(GroundTruth).filter(GroundTruth.node_id == node_id).first()
        is_criminal_gt = gt.is_criminal if gt else False
        role_gt = gt.role if gt else "normal"
        
        nodes_data.append({
            "id": node_id,
            "label": attrs.get("label", node_id),
            "type": attrs.get("type", "Person"),
            "risk_score": risk_score,
            "community_id": community_map.get(node_id, 0),
            "is_criminal_gt": is_criminal_gt,
            "role_gt": role_gt,
            "attributes": {k: v for k, v in attrs.items() if k not in ["type", "label"]}
        })
        
    # 3. Package edges
    edges_data = []
    for u, v, attrs in G.edges(data=True):
        edges_data.append({
            "id": attrs.get("id"),
            "source": u,
            "target": v,
            "type": attrs.get("type", "UNKNOWN"),
            "timestamp": attrs.get("timestamp", None),
            "attributes": {k: v for k, v in attrs.items() if k not in ["type", "id"]}
        })
        
    return {"nodes": nodes_data, "edges": edges_data}

@app.get("/entity/{entity_id}")
def get_entity(entity_id: str, db: Session = Depends(get_db)):
    refresh_graph_if_needed(db)
    G = graph_manager.G
    if entity_id not in G:
        raise HTTPException(status_code=404, detail="Entity not found")
        
    attrs = G.nodes[entity_id]
    risk_score = graph_manager.get_risk_score(entity_id)
    explanation = graph_manager.get_risk_explanation(entity_id)
    
    # Get connected edges
    connected_edges = []
    for u, v, e_attrs in G.edges(entity_id, data=True):
        neighbor_id = v if u == entity_id else u
        neighbor_attrs = G.nodes[neighbor_id]
        
        connected_edges.append({
            "id": e_attrs.get("id"),
            "neighbor_id": neighbor_id,
            "neighbor_label": neighbor_attrs.get("label", neighbor_id),
            "neighbor_type": neighbor_attrs.get("type", "Person"),
            "type": e_attrs.get("type", "UNKNOWN"),
            "attributes": {k: v for k, v in e_attrs.items() if k not in ["type", "id"]}
        })
        
    # Ground truth properties
    gt = db.query(GroundTruth).filter(GroundTruth.node_id == entity_id).first()
    is_criminal_gt = gt.is_criminal if gt else False
    role_gt = gt.role if gt else "normal"
    cell_id = gt.cell_id if gt else None
    
    return {
        "id": entity_id,
        "label": attrs.get("label", entity_id),
        "type": attrs.get("type", "Person"),
        "risk_score": risk_score,
        "explanation": explanation,
        "is_criminal_gt": is_criminal_gt,
        "role_gt": role_gt,
        "cell_id": cell_id,
        "attributes": {k: v for k, v in attrs.items() if k not in ["type", "label"]},
        "connections": connected_edges
    }

@app.get("/communities")
def get_communities(db: Session = Depends(get_db)):
    refresh_graph_if_needed(db)
    G = graph_manager.G
    if G.number_of_nodes() == 0:
        return {"modularity": 0.0, "communities": []}

    if graph_manager.community_cache is None:
        try:
            communities = list(nx.community.greedy_modularity_communities(G, weight='weight'))
            communities = sorted(communities, key=len, reverse=True)[:20]
            modularity = nx.community.modularity(G, communities, weight='weight')
        except Exception as e:
            print(f"Community calculation failed: {e}")
            return {"modularity": 0.0, "communities": []}

        community_list = []
        for comm_idx, node_set in enumerate(communities):
            members = []
            total_risk = 0.0

            for node_id in node_set:
                risk = graph_manager.get_risk_score(node_id)
                total_risk += risk
                attrs = G.nodes[node_id]
                members.append({
                    "id": node_id,
                    "label": attrs.get("label", node_id),
                    "type": attrs.get("type", "Person"),
                    "risk_score": risk
                })

            members.sort(key=lambda x: x['risk_score'], reverse=True)
            avg_risk = total_risk / len(node_set) if len(node_set) > 0 else 0.0

            if len(members) > 2 or avg_risk > 0.3:
                community_list.append({
                    "community_id": comm_idx,
                    "size": len(node_set),
                    "average_risk": avg_risk,
                    "members": members[:12]
                })

        community_list.sort(key=lambda x: x['average_risk'], reverse=True)
        graph_manager.community_cache = {
            "modularity": modularity,
            "communities": community_list
        }

    return graph_manager.community_cache

@app.get("/predicted-links")
def get_predicted_links(limit: int = 50, db: Session = Depends(get_db)):
    refresh_graph_if_needed(db)
    G = graph_manager.G
    if G.number_of_nodes() == 0:
        return []

    if graph_manager.link_cache is None or len(graph_manager.link_cache) < limit:
        ranked_nodes = sorted(G.nodes(), key=lambda n: graph_manager.get_risk_score(n), reverse=True)[:250]
        seen = set()
        predictions = []

        for idx, u in enumerate(ranked_nodes):
            neighbors_u = set(G.neighbors(u))
            for v in ranked_nodes[idx + 1:]:
                if u == v or G.has_edge(u, v):
                    continue
                common = neighbors_u.intersection(set(G.neighbors(v)))
                if not common:
                    continue
                prob = graph_manager.get_link_probability(u, v)
                if prob <= 0.25:
                    continue

                u_attrs = G.nodes[u]
                v_attrs = G.nodes[v]
                pair = tuple(sorted((u, v)))
                if pair in seen:
                    continue
                seen.add(pair)

                predictions.append({
                    "source": u,
                    "source_label": u_attrs.get("label", u),
                    "source_type": u_attrs.get("type", "Person"),
                    "source_risk": graph_manager.get_risk_score(u),
                    "target": v,
                    "target_label": v_attrs.get("label", v),
                    "target_type": v_attrs.get("type", "Person"),
                    "target_risk": graph_manager.get_risk_score(v),
                    "probability": prob,
                    "common_neighbors_count": len(common),
                    "rationale": f"Shares {len(common)} strong connection(s) with elevated proximity indicators."
                })

        predictions.sort(key=lambda x: x['probability'], reverse=True)
        graph_manager.link_cache = predictions[:limit]

    return graph_manager.link_cache[:limit]

@app.get("/anomalies")
def get_anomalies(db: Session = Depends(get_db)):
    refresh_graph_if_needed(db)
    # Run Isolation Forest anomaly detection dynamically on all edges
    edges = db.query(DBEdge).all()
    if not edges or graph_manager.anomaly_model_data is None:
        return []
        
    model_data = graph_manager.anomaly_model_data
    iso = model_data['model']
    feature_cols = model_data['feature_cols']
    
    records = []
    edge_map = {}
    for e in edges:
        freq = float(e.attributes.get('frequency', 1.0))
        dur = float(e.attributes.get('duration_avg', 0.0))
        amt = float(e.attributes.get('amount', 0.0))
        
        is_trans = 1.0 if e.type == 'TRANSACTION' else 0.0
        is_call = 1.0 if e.type == 'CALL' else 0.0
        is_coaccused = 1.0 if e.type == 'CO_ACCUSED' else 0.0
        
        row_dict = {
            "frequency": freq,
            "duration": dur,
            "amount": amt,
            "is_transaction": is_trans,
            "is_call": is_call,
            "is_coaccused": is_coaccused
        }
        records.append(row_dict)
        edge_map[len(records) - 1] = e
        
    anomalies = []
    G = graph_manager.G
    
    for idx, r in enumerate(records):
        row_list = [r[col] for col in feature_cols]
        pred = iso.predict(row_list)
        score = iso.score(row_list)
        
        if pred == -1:  # Anomaly
            edge = edge_map[idx]
            
            # Fetch source/target labels if they exist in G
            src_label = G.nodes[edge.source].get('label', edge.source) if edge.source in G else edge.source
            src_type = G.nodes[edge.source].get('type', "Unknown") if edge.source in G else "Unknown"
            dst_label = G.nodes[edge.target].get('label', edge.target) if edge.target in G else edge.target
            dst_type = G.nodes[edge.target].get('type', "Unknown") if edge.target in G else "Unknown"
            
            anomalies.append({
                "edge_id": edge.id,
                "source": edge.source,
                "source_label": src_label,
                "source_type": src_type,
                "target": edge.target,
                "target_label": dst_label,
                "target_type": dst_type,
                "type": edge.type,
                "timestamp": edge.timestamp,
                "attributes": edge.attributes,
                "anomaly_score": float(score)
            })
            
    # Sort by anomaly score descending (highest score/most anomalous first)
    anomalies.sort(key=lambda x: x['anomaly_score'], reverse=True)
    return anomalies

@app.post("/case")
def add_case(case_input: CaseInputSchema, db: Session = Depends(get_db)):
    # 1. Store case record
    db_case = DBCase(
        case_id=case_input.case_id,
        description=case_input.description
    )
    db.add(db_case)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        # Case might already exist, which is fine, we just update it
        print(f"Case already exists or error: {e}")
        
    # 2. Prepare nodes and edges for live manager
    nodes_list = []
    for n in case_input.nodes:
        nodes_list.append({
            "id": n.id,
            "type": n.type,
            "label": n.label,
            "attributes": n.attributes or {}
        })
        
    edges_list = []
    for e in case_input.edges:
        edges_list.append({
            "source": e.source,
            "target": e.target,
            "type": e.type,
            "attributes": e.attributes or {}
        })
        
    # 3. Call live manager to update and recompute features/scores
    try:
        updated_scores = graph_manager.add_case_live(nodes_list, edges_list, db)
        return {
            "status": "success",
            "message": f"Successfully ingested case {case_input.case_id}. Ingested {len(nodes_list)} nodes and {len(edges_list)} edges.",
            "updated_scores": updated_scores
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to ingest case data: {str(e)}")
