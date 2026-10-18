import numpy as np
from typing import List, Dict, Any
from ..models.schemas import AnomalySchema, EdgeSchema

def detect_anomalies(edges: List[EdgeSchema]) -> List[AnomalySchema]:
    """
    Detects behavioral and financial anomalies using:
    1. Isolation Forest on numeric interaction attributes (amount, duration, hour of day, frequency).
    2. Rule-based detection for odd-hour communications (01:00 AM - 04:00 AM).
    3. Rule-based detection for rapid structured transactions (< 50,000 INR smurfing).
    4. Rule-based detection for rapid cash liquidation post high-value RTGS.
    """
    anomalies: List[AnomalySchema] = []

    try:
        from sklearn.ensemble import IsolationForest
    except Exception as ex:
        IsolationForest = None
        print(f"IsolationForest unavailable; using rule-based anomaly detection: {ex}")
    
    # 1. Rule-Based: Odd-Hour Telecom Activity (01:00 AM - 04:00 AM)
    odd_hour_calls = []
    odd_hour_refs = []
    odd_hour_entities = set()

    for e in edges:
        if e.type == "Call" and e.last_seen:
            try:
                # e.g., "2026-08-12 02:15:40"
                time_part = e.last_seen.split(" ")[1] if " " in e.last_seen else e.last_seen
                hour = int(time_part.split(":")[0])
                if 1 <= hour <= 4:
                    odd_hour_calls.append(e)
                    odd_hour_entities.add(e.source)
                    odd_hour_entities.add(e.target)
                    if e.evidence_ref:
                        odd_hour_refs.append(e.evidence_ref)
            except Exception:
                pass

    if len(odd_hour_calls) >= 2:
        anomalies.append(AnomalySchema(
            id="anom_odd_hour_calls",
            entity_ids=list(odd_hour_entities),
            description=f"Cluster of {len(odd_hour_calls)} tactical telecom interactions initiated during odd midnight hours (01:00 AM – 04:00 AM). Indicates covert operational coordination.",
            severity="high",
            evidence_refs=list(dict.fromkeys(odd_hour_refs))[:6],
            attributes={"call_count": len(odd_hour_calls), "time_window": "01:00-04:00"}
        ))

    # 2. Rule-Based: Same-day Cash Withdrawal Post RTGS Credit (Hawala Layering)
    txns = [e for e in edges if e.type == "Transaction"]
    
    # Group transactions by beneficiary / account
    cash_withdrawals = []
    large_rtgs_inflows = []
    
    for t in txns:
        mode = str(t.attributes.get("mode", "")).upper()
        amt = float(t.attributes.get("amount", 0.0))
        date_str = str(t.attributes.get("date", ""))
        ref = t.evidence_ref

        if mode == "CASH" and amt >= 100000.0:
            cash_withdrawals.append((t, date_str.split(" ")[0] if " " in date_str else date_str, ref, t.source))
        elif mode == "RTGS" and amt >= 1000000.0:
            large_rtgs_inflows.append((t, date_str.split(" ")[0] if " " in date_str else date_str, ref, t.target))

    # Check for same-day liquidation
    flagged_liquidation_refs = []
    flagged_entities = set()
    for rtgs_t, r_date, r_ref, r_beneficiary in large_rtgs_inflows:
        matching_cash = [cw for cw in cash_withdrawals if cw[1] == r_date and cw[3] == r_beneficiary]
        if len(matching_cash) >= 2:
            total_cash = sum(float(cw[0].attributes.get("amount", 0.0)) for cw in matching_cash)
            refs = [r_ref] + [cw[2] for cw in matching_cash if cw[2]]
            flagged_liquidation_refs.extend(refs)
            flagged_entities.add(r_beneficiary)
            for cw in matching_cash:
                flagged_entities.add(cw[0].target)
                
            anomalies.append(AnomalySchema(
                id="anom_rapid_cash_liquidation",
                entity_ids=list(flagged_entities),
                description=f"Immediate multi-tranche cash withdrawals (₹{int(total_cash):,}) executed on the same day following high-value RTGS inflow (₹{int(float(rtgs_t.attributes.get('amount', 0.0))):,}). Classic layering pattern.",
                severity="high",
                evidence_refs=list(dict.fromkeys(refs)),
                attributes={"rtgs_inflow": float(rtgs_t.attributes.get("amount", 0.0)), "cash_withdrawn": total_cash}
            ))
            break

    # 3. Rule-Based: Smurfing / Rapid Structured Transactions Just Under Reporting Limits
    structured_refs = []
    structured_entities = set()
    for t in txns:
        amt = float(t.attributes.get("amount", 0.0))
        # Between 45,000 and 49,999 (Indian reporting threshold is 50,000)
        if 45000.0 <= amt < 50000.0:
            structured_refs.append(t.evidence_ref)
            structured_entities.add(t.source)
            structured_entities.add(t.target)

    if len(structured_refs) >= 2:
        anomalies.append(AnomalySchema(
            id="anom_structured_smurfing",
            entity_ids=list(structured_entities),
            description=f"Detection of {len(structured_refs)} structured transfers strictly calibrated below the ₹50,000 regulatory reporting threshold (smurfing pattern).",
            severity="medium",
            evidence_refs=list(dict.fromkeys(structured_refs)),
            attributes={"count": len(structured_refs), "threshold_band": "45,000 - 49,999"}
        ))

    # 4. Machine Learning: Isolation Forest on Numeric Edge Feature Vectors
    if len(edges) >= 8 and IsolationForest is not None:
        feature_matrix = []
        edge_lookup = []

        for e in edges:
            amt = float(e.attributes.get("amount", 0.0))
            dur = float(e.attributes.get("duration_sec", 0.0))
            
            # Extract hour of day
            hour = 12.0
            if e.last_seen:
                try:
                    time_part = e.last_seen.split(" ")[1] if " " in e.last_seen else e.last_seen
                    hour = float(time_part.split(":")[0])
                except Exception:
                    pass

            is_trans = 1.0 if e.type == "Transaction" else 0.0
            is_call = 1.0 if e.type == "Call" else 0.0
            weight = float(e.weight)

            feature_matrix.append([amt, dur, hour, is_trans, is_call, weight])
            edge_lookup.append(e)

        try:
            X = np.array(feature_matrix)
            # Isolation Forest with 30 estimators for snappy sub-second performance
            iso = IsolationForest(n_estimators=30, contamination=0.15, random_state=42, n_jobs=1)
            preds = iso.fit_predict(X)
            scores = iso.score_samples(X)

            # Gather top outliers that haven't already been covered
            iso_anom_edges = []
            for idx, p in enumerate(preds):
                if p == -1:
                    edge_obj = edge_lookup[idx]
                    iso_anom_edges.append((edge_obj, scores[idx]))

            # Sort by anomaly score ascending (most negative = most abnormal)
            iso_anom_edges.sort(key=lambda x: x[1])

            top_outliers = iso_anom_edges[:3]
            if top_outliers:
                outlier_refs = [e.evidence_ref for e, s in top_outliers if e.evidence_ref]
                outlier_nodes = set()
                for e, s in top_outliers:
                    outlier_nodes.add(e.source)
                    outlier_nodes.add(e.target)

                anomalies.append(AnomalySchema(
                    id="anom_isolation_forest_statistical",
                    entity_ids=list(outlier_nodes),
                    description=f"Isolation Forest multidimensional outlier detection flagged {len(top_outliers)} interaction(s) with extreme statistical deviation in volume, duration, or timing.",
                    severity="high" if any(e.type == "Transaction" for e, s in top_outliers) else "medium",
                    evidence_refs=list(dict.fromkeys(outlier_refs)),
                    attributes={"model": "IsolationForest", "contamination": 0.15}
                ))
        except Exception as ex:
            print(f"IsolationForest scoring failed: {ex}")

    return anomalies
