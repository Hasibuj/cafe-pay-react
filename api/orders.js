/**
 * Vercel serverless — CafePay live orders API.
 * Routes to the shared handler in lib/ordersHttp.js.
 */
import { handleOrders } from './lib/ordersHttp.js'

export default async function handler(req, res) {
  return handleOrders(req, res)
}