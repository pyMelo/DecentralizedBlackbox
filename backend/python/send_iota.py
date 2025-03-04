import sys
from iota_sdk import Client, utf8_to_hex

NODE_URL = 'https://api.testnet.iotaledger.net'
client = Client(nodes=[NODE_URL])

def send_data_to_iota(vehicle_id, hex_data):
    try:
        # Convert vehicle_id to raw hex, no 0x prefix
        tag_hex = utf8_to_hex(vehicle_id)  # e.g. "76656869636c652d313233"

        if not hex_data.startswith('0x'):
            hex_data = '0x' + hex_data

            
        # Build and post the block
        block_info = client.build_and_post_block(
            secret_manager=None,
            tag=tag_hex,   # raw hex for the tag
            data=hex_data  # raw hex for the data
        )

        # The block ID is usually the first element returned
        block_id = block_info[0]  
        return block_id

    except Exception as e:
        print(f"❌ Error sending to IOTA: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    try:
        vehicle_id = sys.argv[1]
        hex_data = sys.argv[2]

        block_id = send_data_to_iota(vehicle_id, hex_data)
        print(block_id)
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)
