import { useState, useEffect } from 'react';

export interface EnvironmentData {
    temperature: number;
    humidity: number;
    co2: number;
    pm25: number;
    tvoc: number;
    noise: number;
}

export interface EnergyData {
    today: number;
    month: number;
    power: number;
}

export function useHomeStatistics() {
    const [environment, setEnvironment] = useState<EnvironmentData | null>(null);
    const [energy, setEnergy] = useState<EnergyData | null>(null);

    useEffect(() => {
        // Simulate fetching data
        const fetchData = () => {
            // Randomize slightly to show liveliness
            /* 
               User requested to show "Offline" / "Not Connected" state.
               So we intentionally do not set data here to simulate that scenario.
            */
            setEnvironment(null);
            setEnergy(null);
        };

        // Initial delay to simulate loading
        const timer = setTimeout(fetchData, 1500);

        // Update every 30 seconds
        const interval = setInterval(fetchData, 30000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, []);

    return { environment, energy };
}
