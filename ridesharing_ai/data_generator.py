import pandas as pd
import numpy as np
import random

def generate_simulated_data(num_records=10000, output_file='simulated_trips.csv'):
    print(f"Generando {num_records} registros simulados de viajes...")
    np.random.seed(42)
    
    # Generar características aleatorias
    # Distancia de desvío entre 0.5 y 15.0 km
    detour_distance_km = np.random.uniform(0.5, 15.0, num_records)
    
    # Tiempo de desvío (correlacionado con la distancia + tráfico aleatorio)
    # Asumimos una velocidad promedio entre 15 km/h y 60 km/h
    speeds_kmh = np.random.uniform(15, 60, num_records)
    detour_time_min = (detour_distance_km / speeds_kmh) * 60
    
    # Riesgo de la zona (0.0 a 1.0)
    pickup_zone_risk = np.random.beta(2, 5, num_records) # Mayormente riesgo bajo
    
    # Ganancia extra esperada (MXN)
    # Generalmente proporcional a la distancia + una base
    expected_extra_profit = 20.0 + (detour_distance_km * np.random.uniform(5, 12, num_records))
    
    # Costo estimado de gasolina (MXN) - aprox $24 por litro, asumiendo 12 km/l
    fuel_cost_estimate = (detour_distance_km / 12.0) * 24.0
    
    # Hora del día (0 - 23)
    hour_of_day = np.random.randint(0, 24, num_records)
    
    # Lluvia (Aprox 15% de probabilidad)
    is_raining = np.random.choice([0, 1], p=[0.85, 0.15], size=num_records)
    
    # Aceptación histórica del conductor (0.0 a 1.0)
    driver_historical_acceptance = np.random.normal(0.7, 0.15, num_records)
    driver_historical_acceptance = np.clip(driver_historical_acceptance, 0.0, 1.0)
    
    # Heurística para generar la etiqueta 'target_accepted'
    # Intentamos imitar el razonamiento humano de un conductor
    
    # Ganancia neta
    net_profit = expected_extra_profit - fuel_cost_estimate
    
    # Beneficio por minuto de desvío
    profit_per_min = net_profit / (detour_time_min + 1) # evitar div / 0
    
    # Score base
    score = (profit_per_min * 3.0) + (driver_historical_acceptance * 5.0) - (pickup_zone_risk * 4.0) - (is_raining * 3.0)
    
    # Penalizar desvíos muy largos (> 20 mins) independientemente del pago (fatiga)
    score -= np.where(detour_time_min > 20, (detour_time_min - 20) * 0.5, 0)
    
    # Añadir un poco de ruido para que el ML tenga que generalizar
    noise = np.random.normal(0, 2.0, num_records)
    score += noise
    
    # Función sigmoide para probabilidad
    probability = 1.0 / (1.0 + np.exp(-score))
    
    # Target: 1 si probabilidad > 0.5, si no 0
    target_accepted = (probability > 0.5).astype(int)
    
    # Crear el DataFrame
    df = pd.DataFrame({
        'detour_distance_km': np.round(detour_distance_km, 2),
        'detour_time_min': np.round(detour_time_min, 2),
        'pickup_zone_risk': np.round(pickup_zone_risk, 2),
        'expected_extra_profit': np.round(expected_extra_profit, 2),
        'fuel_cost_estimate': np.round(fuel_cost_estimate, 2),
        'hour_of_day': hour_of_day,
        'is_raining': is_raining,
        'driver_historical_acceptance': np.round(driver_historical_acceptance, 2),
        'target_accepted': target_accepted
    })
    
    # Guardar en CSV
    df.to_csv(output_file, index=False)
    print(f"Dataset generado y guardado en: {output_file}")
    print(f"Distribución del target (Aceptados=1, Rechazados=0):\n{df['target_accepted'].value_counts(normalize=True) * 100}")

if __name__ == '__main__':
    generate_simulated_data()
