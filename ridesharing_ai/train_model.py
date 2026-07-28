import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import json

def train_and_save_model(data_path='simulated_trips.csv', model_path='rideshare_model.json'):
    print(f"Cargando datos desde {data_path}...")
    df = pd.read_csv(data_path)
    
    # Separar características (X) y objetivo (y)
    X = df.drop('target_accepted', axis=1)
    y = df['target_accepted']
    
    # Dividir en conjunto de entrenamiento y prueba
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Calcular scale_pos_weight para clases desbalanceadas
    # (n_negativos / n_positivos)
    n_neg = (y_train == 0).sum()
    n_pos = (y_train == 1).sum()
    scale_weight = n_neg / n_pos if n_pos > 0 else 1.0
    
    print("Entrenando modelo XGBoost...")
    # Inicializar el clasificador
    model = xgb.XGBClassifier(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        scale_pos_weight=scale_weight,
        random_state=42,
        eval_metric='logloss'
    )
    
    # Entrenar el modelo
    model.fit(X_train, y_train)
    
    # Evaluar el modelo
    print("Evaluando modelo...")
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\nExactitud (Accuracy): {accuracy:.4f}")
    print("\nReporte de Clasificación:")
    print(classification_report(y_test, y_pred))
    
    # Importancia de las características
    importance = model.feature_importances_
    feature_importance = pd.DataFrame({'Feature': X.columns, 'Importance': importance})
    feature_importance = feature_importance.sort_values(by='Importance', ascending=False)
    print("\nImportancia de las variables (Feature Importance):")
    print(feature_importance)
    
    # Guardar el modelo
    model.save_model(model_path)
    print(f"\nModelo guardado exitosamente en: {model_path}")
    
    # Guardar nombres de columnas para inferencia posterior
    with open('feature_names.json', 'w') as f:
        json.dump(list(X.columns), f)

if __name__ == '__main__':
    train_and_save_model()
