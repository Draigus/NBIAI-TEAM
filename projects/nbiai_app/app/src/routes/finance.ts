/**
 * Finance module routes.
 *
 * Revenue:
 * GET    /api/v1/finance/revenue        — list revenue items with GBP primary display
 * POST   /api/v1/finance/revenue        — create a revenue item (board/admin only)
 * PATCH  /api/v1/finance/revenue/:id    — update a revenue item
 * DELETE /api/v1/finance/revenue/:id    — delete a revenue item (board only)
 *
 * Payroll:
 * GET    /api/v1/finance/payroll        — list human and agent payroll items
 * POST   /api/v1/finance/payroll        — create a payroll item (board only)
 * PATCH  /api/v1/finance/payroll/:id    — update a payroll item
 *
 * Summary:
 * GET    /api/v1/finance/summary        — monthly P&L summary (MRR, payroll, agent costs, margin)
 *
 * Currency note (CEO binding decision):
 * - Revenue and payroll are displayed in GBP as primary currency.
 * - Agent API costs are displayed in USD.
 * - All amounts are stored in native currency with a currency code column.
 *
 * TODO: implement
 */

import type { FastifyInstance } from 'fastify'

export async function financeRoutes(fastify: FastifyInstance): Promise<void> {
  // TODO: implement revenue, payroll, and financial summary endpoints
}
