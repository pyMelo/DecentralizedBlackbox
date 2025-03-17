#[allow(duplicate_alias)]
module 0x0::SensorData {
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use std::string::String;

    /// Event that holds the sensor data.
    public struct SensorDataEvent has copy, drop {
        timestamp: u64,
        hex_data: String,
    }

    /// Entry function that emits an event with the sensor data (no UID, no stored object).
    public entry fun send_sensor_data(
        timestamp: u64,
        hex_data: String,
        ctx: &mut TxContext
    ) {
        let e = SensorDataEvent {
            timestamp,
            hex_data,
        };
        event::emit(e);
    }
}

