from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import xgboost as xgb
import pandas as pd
import json

app = FastAPI(
    title="Ridesharing AI Inference API",
    description="API para estimar la conveniencia de viajes compartidos",
    version="1.0.0"
)

# Inicializar modelo globalmente
model = None
feature_names = None

class TripFeatures(BaseModel):
    detour_distance_km: float
    detour_time_min: float
    pickup_zone_risk: float
    expected_extra_profit: float
    fuel_cost_estimate: float
    hour_of_day: int
    is_raining: int
    driver_historical_acceptance: float

@app.on_event("startup")
def load_model():
    global model, feature_names
    try:
        model = xgb.XGBClassifier()
        model.load_model("rideshare_model.json")
        with open("feature_names.json", "r") as f:
            feature_names = json.load(f)
        print("Modelo XGBoost cargado exitosamente.")
    except Exception as e:
        print(f"Error al cargar el modelo: {e}")

@app.post("/predict")
def predict_convenience(features: TripFeatures):
    if model is None:
        raise HTTPException(status_code=500, detail="Modelo no cargado.")
    
    try:
        # Convertir input a DataFrame para asegurar orden de columnas
        input_data = pd.DataFrame([features.dict()])
        
        # Asegurar que las columnas coinciden con el entrenamiento
        input_data = input_data[feature_names]
        
        # Predecir probabilidad (clase 1 = aceptado)
        prob = model.predict_proba(input_data)[0][1]
        
        # Predecir clase final
        prediction = model.predict(input_data)[0]
        
        return {
            "convenience_score": float(prob),
            "recommendation": "ACCEPT" if prediction == 1 else "REJECT",
            "is_convenient": bool(prediction == 1)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/")
def health_check():
    return {"status": "ok", "model_loaded": model is not None}
