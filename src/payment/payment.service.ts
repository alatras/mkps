import Stripe from 'stripe'
import { Injectable } from '@nestjs/common'

@Injectable()
export class PaymentService {
  private stripe: Stripe

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2022-11-15'
    })
  }

  /**
   * Get a Stripe account by ID
   * @param accountId Stripe account ID
   */
  async getAccount(accountId: string): Promise<Stripe.Account> {
    return await this.stripe.accounts.retrieve(accountId)
  }
}
