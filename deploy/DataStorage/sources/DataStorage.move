#[allow(duplicate_alias)]
module 0x0::DataStorage {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;
    use sui::transfer;

    /// A record that holds raw JSON data as bytes.
    public struct DataRecord has key, store {
        id: UID,
        /// Raw JSON stored as a vector of bytes
        json_bytes: vector<u8>,
        creator: address,
    }

    /// Stores raw JSON bytes in the DataRecord.
    public fun store_json(json_bytes: vector<u8>, ctx: &mut TxContext) {
        let record = DataRecord {
            id: object::new(ctx),
            json_bytes,
            creator: ctx.sender(),
        };
        transfer::share_object(record);
    }

    /// Retrieves the stored raw JSON bytes (which off-chain you can parse as actual JSON).
    public fun get_json_bytes(record: &DataRecord): &vector<u8> {
        &record.json_bytes
    }

    /// Returns the creator address of the DataRecord.
    public fun get_creator(record: &DataRecord): address {
        record.creator
    }
}
