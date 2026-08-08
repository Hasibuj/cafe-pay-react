/**
 * Vercel serverless — CafePay notifications API.
 * Routes to the shared handler in lib/ordersHttp.js.
 */
import { handleNotifications } from './lib/ordersHttp.js'

export default async function handler(req, res) {
  return handleNotifications(req, res)
}