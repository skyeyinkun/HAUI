// Web Worker for Room Inference
// This worker processes a list of devices and infers their room based on name matching.

// Define types locally since we can't easily import from main thread types in a simple worker setup without complex build config
interface DeviceInfo {
    id: number | string;
    name: string;
    entity_id?: string;
    room?: string;
    original_room?: string;
}

interface RoomConfig {
    roomKeywords: Record<string, string[]>;
    priority: string[];
}

interface WorkerMessage {
    type: 'infer';
    devices: DeviceInfo[];
    config: RoomConfig;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const { type, devices, config } = e.data;

    if (type === 'infer') {
        const start = performance.now();
        const results = devices.map(device => {
            // Skip if already has a valid room (not '未分配')
            if (device.room && device.room !== '未分配') {
                return device;
            }

            const name = device.name || '';
            const entityId = device.entity_id || '';
            let inferredRoom = '未分配';
            let bestMatchIndex = Infinity;

            // Search through priority list
            for (const room of config.priority) {
                const keywords = config.roomKeywords[room] || [];
                
                // Check if any keyword matches name or entity_id
                const match = keywords.some(keyword => 
                    name.includes(keyword) || entityId.includes(keyword)
                );

                if (match) {
                    const priorityIndex = config.priority.indexOf(room);
                    if (priorityIndex < bestMatchIndex) {
                        bestMatchIndex = priorityIndex;
                        inferredRoom = room;
                        // Since we iterate in priority order, the first match is the best match?
                        // Actually, if we iterate config.priority array, the first one IS the highest priority.
                        // So we can break immediately.
                        break;
                    }
                }
            }

            return {
                ...device,
                room: inferredRoom
            };
        });

        const end = performance.now();
        console.log(`[RoomInferenceWorker] Processed ${devices.length} devices in ${(end - start).toFixed(2)}ms`);

        self.postMessage({ type: 'result', devices: results });
    }
};