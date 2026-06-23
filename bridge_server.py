import asyncio
import websockets

CLIENTS = set()

async def handler(websocket):

    CLIENTS.add(websocket)

    print("Client connected")

    try:

        async for message in websocket:

            print("Received:", message)

            dead = []

            for client in CLIENTS:

                if client != websocket:

                    try:
                        await client.send(message)

                    except:
                        dead.append(client)

            for d in dead:
                CLIENTS.discard(d)

    finally:

        CLIENTS.discard(websocket)

        print("Client disconnected")

async def main():

    async with websockets.serve(
        handler,
        "localhost",
        8765
    ):

        print("Bridge Ready")

        await asyncio.Future()

asyncio.run(main())