/**
 * In-memory realtime hub for order events.
 * Channels are scoped by address so a customer only receives their own orders
 * and an owner only receives their shop's orders.
 *
 * Channel names:
 *   owner:<lowercased ownerAddress>  → order.created / order.updated for that shop
 *   buyer:<lowercased buyerAddress>  → order.created / order.updated for that customer
 */
export function createRealtimeHub() {
  const sockets = new Set()

  function toChannel(kind, address) {
    return `${kind}:${String(address || '').toLowerCase()}`
  }

  function channelsForOrder(order) {
    return [toChannel('owner', order?.shopOwner), toChannel('buyer', order?.buyer)]
  }

  /** Register a socket. Returns an unsubscribe function. */
  function addSocket(socket) {
    socket.channels = new Set()
    sockets.add(socket)
    return () => {
      sockets.delete(socket)
    }
  }

  /** Subscribe a socket to a channel (e.g. owner:0x..). */
  function subscribe(socket, channel) {
    if (socket?.channels) socket.channels.add(channel)
  }

  /** Broadcast an event { type, order?, notification?, channels? } to sockets
   *  listening on relevant channels. When `channels` is provided it is used
   *  verbatim; otherwise channels are derived from the order. */
  function publish(event) {
    const targets = new Set(event.channels || channelsForOrder(event.order))
    if (!targets.size) return 0
    let sent = 0
    for (const socket of sockets) {
      let match = false
      if (socket.channels) {
        for (const ch of socket.channels) {
          if (targets.has(ch)) {
            match = true
            break
          }
        }
      }
      if (match && socket.readyState === 1) {
        try {
          socket.send(JSON.stringify(event))
          sent += 1
        } catch {
          /* drop */
        }
      }
    }
    return sent
  }

  return { addSocket, subscribe, publish }
}
