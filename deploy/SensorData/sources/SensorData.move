#[allow(duplicate_alias)]
module 0x0::SensorData {
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use std::string::String;

    /// Event that holds the sensor data.
    public struct SensorDataEvent has copy, drop {
        vehicle_id: String,
        timestamp: u64,
        hex_data: String,
    }

    /// Entry function that emits an event with the sensor data (no UID, no stored object).
    public entry fun send_sensor_data(
        vehicle_id: String,
        timestamp: u64,
        hex_data: String,
        ctx: &mut TxContext
    ) {
        let e = SensorDataEvent {
            vehicle_id,
            timestamp,
            hex_data,
        };
        event::emit(e);
    }
}


// package ID : 0x40b03a280003d60b9a6f4b184c4c6066c940ab6a4830e9e97f6394aceaf5a095
// sui pv key : 7cd59cf6b3d002f41be14bd684d022234ddfe69696b6d5b5ed84e30c40df26c7