Terms of usage
Last updated April 8, 2025

ACINQ SAS ("ACINQ" or "We" or "Us") is a French company whose registered office is located at 10 rue de Penthièvre 75008 Paris, France, with a capital of 84 346 euros (€), registered at the Paris Trade and Companies Register with registration number 804 203 792. Our contact email is phoenix@acinq.co.

This agreement ("Agreement" or "Terms") between ACINQ ("We", "Our") and you ("You", "Your") describes the terms and conditions governing your use of Phoenix Wallet and/or Phoenixd ("Service", "Application" or "Wallet").

By creating or restoring a Wallet, you are agreeing to be bound by the terms of this Agreement, acknowledge and agree that you have carefully read and understood our FAQ, and warrant you have the power and capacity to enter into this Agreement.

Note that the agreement is subject to change by ACINQ in its sole discretion at any time. We will update the “Last Updated” date at the top of the Terms. If you do not agree to any change(s), you shall stop using the Service. Otherwise, your continued use of the Service constitutes your acceptance of such change(s). PLEASE REGULARLY CHECK THE WEBSITE TO VIEW THE THEN-CURRENT AGREEMENT.

Service usage
The Phoenix application enables you to create a non-custodial cryptocurrency wallet for Bitcoin, and to use the Wallet to store, send, request and receive Bitcoins.

Our application is intended for use by persons who are very knowledgeable about cryptocurrency generally and non-custodial wallets in particular. If you use our service, you represent that you qualify as such a person. You acknowledge and agree that you have carefully read and understood our FAQ.

Eligibility
The Service is only available to persons in eligible countries. You may not use the Service if you are located in, or a citizen or resident of, any other jurisdiction where ACINQ have determined to prohibit use of the Services (collectively, "Restricted Jurisdictions").

In our discretion we may not provide the Service (or may provide limited services) in one or more countries from time to time or determine that one or more countries are Restricted Jurisdictions.

User Rights and Responsibilities
Reponsibility for the wallet's seed
The application uses a 12-word phrase ("Seed", "Mnemonics") as a seed to a Lightning wallet and a BIP32 hierarchical wallet. This seed gives access to all assets stored in the wallet.

If you use Phoenix to create a Wallet, the wallet will use an algorithm to generate a seed. This seed is stored on your device only. We do not know, store, or have access to your seed. We cannot provide assistance if you lose or forget your seed.

It is your responsibility to carefully guard your seed secure and make a backup. You must not give the seed to anyone.

Seed and impact of their loss or misappropriation
If you permanently forget or lose your seed, you will never be able to recover any funds in your wallet, and will suffer a complete, irrecoverable and catastrophic loss of all funds in your wallet.

ACINQ has no responsibility and will not be liable for any loss or damage you suffer from the loss or misappropriation of your seed.

Securing access to the application
If available on your device, Phoenix provides a way to prevent unwanted access to your wallet, using the device's biometrics system. It is your responsibility to make sure your device's biometrics authentication system is properly configured, and only grants access to you.

Keeping your device up-to-date and secure
You must make sure the device the application is running on is secure, especially that its Operating System is up-to-date, with the latest security patches available.

Your device must not be rooted, otherwise the application will not be secure, and your seed will be exposed.

How it works
Phoenix is a non-custodial, Bitcoin-only wallet, that uses the Lightning Network to store, receive, and send payments over Lightning. You need to have a working Internet connection to use the wallet.

The application connects to a Lightning node ("Peer") managed by ACINQ, and in cooperation with the peer will automatically open, maintain, and close Lightning payment channels. Those channels are secured using multisig transactions signed with your seed and the peer's.

The wallet's balance is the aggregate usable balance of your payment channels.

Payments are relayed by the peer through your channels. If you cannot connect to the peer, you will not be able to send or receive payments.

As much as possible, the wallet and the peer will cooperate in order to make payments complete properly, either with a failure or a success. However in some cases, including but not limited to payment errors or connection issues, a payment may not be able to complete properly, in which case the channels that forwarded the faulty payment will have to be force-close (see the Termination section).

Outgoing Lightning payments
The wallet delegates route calculation to the peer. When sending payments the wallet allocates a fixed fee to the peer to route the payment. If no route can be found, the payment fails and funds come back to the wallet.

Incoming Lightning payments with enough liquidity
When a payment is incoming to the wallet, and the wallet has enough inbound liquidity, the payment is received without incurring any fees.

Incoming Lightning payments with no channel, or insufficient liquidity
When a payment is incoming to the wallet, and the wallet has no channel, the peer will open a new channel.

When a payment is incoming to the wallet, and the wallet already has a channel, but insufficient liquidity, the peer will automatically splice the funds into that existing channel.

In both cases, channel creation or splice-in, the operation involves an on-chain transaction whose fees are paid by the wallet. In addition, a fee is paid to the peer for the operation.

The wallet may reject the splice-in or the channel creation at discretion, for example if the fee is too high. In that case the payment fails. This is done automatically, using user-configurable settings in the wallet.

Payments to on-chain addresses ("swap-out")
The wallet is able to splice funds out of their channels and send these funds to an on-chain Bitcoin address. The wallet may use a feerate of his choosing for this operation. This operation decreases the capacity of the channels involved in the splice.

On-chain transactions to the wallet ("swap-in")
The wallet can receive funds on an on-chain multisig address managed by both the peer and the wallet. After confirmations, funds on that wallet will be swapped to Lightning channels. The swap involves an on-chain transaction whose fees are paid by the wallet. Only after the swap will the wallet be able to spend these funds.

The wallet may reject swap-in attempts, including if the fee is too high. This is done automatically, using user-configurable settings in the wallet. In that case, funds remain on the swap-in wallet as unspent outputs.

Unspent outputs on the swap-in wallet will be able to be swapped as long as they are within the delay of the multisig scheme. Once that delay has passed, unspent outputs will not be eligible for swap. Instead, the user will be able to unilaterally spend these funds on-chain.

Requesting liquidity
The user is able to manually request inbound liquidity from the peer, against a fee that is paid to the peer. The peer provides this liquidity for a given duration. During that duration, the peer will not voluntarily close or splice the requested amount of liquidity out of the channel.

After that duration has expired, any requested liquidity that has not been used can be spliced-out by the peer.

Fee credit
On some platforms, the wallet is able to use a fee credit system, managed by the peer, and used to prepay the fees for incoming Lightning payments. This allows the user to accept an incoming payment even if that payment is too small to cover the incoming fees by itself. When that happens, some or all of the incoming amount accrues to the user's fee credit.

This fee credit will be consumed when a payment is received, a splice-in or channel creation is required, and the fee credit is sufficient to pay for the operation. The fee credit may not be consumed entirely. In that case, the remaining fee-credit will left aside to be used in a future similar operation.

The user understands that this fee credit is not refundable, and that it cannot be used for anything else than paying a splice-in or a channel creation fee on Phoenix. Specifically, the user understands that their fee credit is not part of their balance.

Termination and channels closing
You can close your channels at any time. When doing so, and as much as possible, you should close your channels mutually, using the "close channels" feature in the settings.

You understand that the "force-close" button available in the settings is an emergency protocol that should not be used in normal situation, and that it will incurs significant costs and delay to you.

In certain scenarios, including but not limited to catastrophic payment errors, connection issues, bugs in the Lightning or Bitcoin protocol, attacks on the network, Lightning channels in the wallet will be force-closed. Any remaining funds will be recovered on-chain, following instructions provided in the FAQ. The force-closings incurs a long delay (at least several days), and a significant fee paid to the Bitcoin miners using the peer's and wallet's balance in the channels.

Channels life expectancy
The peer will open channels to your wallet and allocate incoming liquidity in addition to your balance, for your convenience. The peer reserves the right to close channels, or reclaim liquidity from channels at any time.

Recovery
Your channels are regularly encrypted and sent to the peer for backup. You can always recover them by connecting to the peer using your seed, and get back access to your funds.

At any time, users can close their channels and recover their funds on-chain, even if the peer is offline or not responding, using the force-close feature (see FAQ).

Price and exchange rates
The wallet can display Bitcoin amounts in alternative fiat currencies using exchange rates provided by 3rd party services. These rates may not be accurate.

Any prices displayed are not indicative of Bitcoins being backed by any commodity or other form of money or having any other tangible value at all. We make no guarantees that Bitcoins can be exchanged or sold at the price displayed. We have no control over and do not make any representations regarding the value of Bitcoins.

You should always refer to the Bitcoins amount before receiving or sending a payment, and not the fiat currency price. We are not responsible for the third-party services providing the prices, and will not be liable for any loss or damage caused by third party services.

Intellectual Property
We grant you a limited, personal, non-transferable, non-exclusive license to access and use the Website and to use the Services as provided to you by ACINQ, subject to the terms of this Agreement and solely for approved purposes as permitted by us from time to time, except that we license certain of our software under the licenses set out in the source code repositories available here. Any other use of the Website or the Services is expressly prohibited and all other rights, titles and interests in the Website and the Services are exclusively the property of ACINQ and its licensors. "Phoenix" and all logos related to the Services or displayed on the Website are trademarks of ACINQ or its licensors. You may not copy, imitate or use them without our prior written consent.

Privacy and Data protection
You acknowledge we may collect and store data in relation to you. For more information on the way in which we process the information about you, please refer to our Privacy Policy.

Dispute resolution and Applicable laws
In any dispute that may arise from the interpretation and execution of these Terms, the parties shall first attempt to reach an amicable settlement. The dispute shall otherwised be governed by French law, and you agree that you will resolve any claim you have with us exclusively in the competent court within the jurisdiction of the Paris Court of Appeal ruling under French law.

Miscellaneous
No action or inaction by ACINQ will be considered a waiver of any right or obligation by ACINQ.

This Agreement may be amended by ACINQ at our discretion. If you do not agree to the amended agreement then your sole remedy will be to stop using the Wallet.

This Agreement controls the relationship between ACINQ and you. They do not create any third party beneficiary rights.

Your use of the Services, any Wallet and the Website is subject to international export controls and economic sanctions requirements. You agree that you will comply with those requirements. You are not permitted to use any of the Services if (1) you are a in, under the control of, or a national or resident of any country subject to sanctions by the United Nations, the United States of America, the European Union, the United Kingdom, or other relevant sanctions authority ("Sanctioned Country"); or (2) you intend to supply Bitcoins in Phoenix to a Sanctioned Country (or a national or resident of a Sanctioned Country).

You represent and warrant that you are using the Services, including any Wallet, in accordance with applicable law, and not for any purpose not in compliance with applicable law, including but not limited to illegal gambling, fraud, money laundering or terrorist activities.

All provisions of this Agreement which by their nature extend beyond the expiration or termination of this Agreement, will continue to be binding and operate after the termination or expiration of this Agreement. If a particular term of this Agreement is determined to be invalid or not enforceable under any applicable law, this will not affect the validity of any other term. This Agreement (including documents incorporated by reference in it) is the entire agreement between ACINQ and you and supersedes any other agreement, representations (or misrepresentations), or understanding, however communicated.

Warranties
WE PROVIDE THE SERVICE "AS IS", WITHOUT ANY EXPRESS, IMPLIED, OR STATUTORY WARRANTIES OF ANY KIND, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OF THE SERVICE, EMPLOYEES AND AFFILIATES OF ACINQ, COPYRIGHT HOLDERS, OR ACINQ BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SERVICE OR THE USE OR OTHER DEALINGS IN THE SERVICE.

Liabilities
UNDER NO CIRCUMSTANCES WILL ACINQ OR ITS AFFILIATES, OR ANY OF ITS OR THEIR RESPECTIVE SERVICE PROVIDERS, BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY USE, INTERRUPTION, DELAY OR INABILITY TO USE THE SERVICE, LOST REVENUES OR PROFITS, DELAYS, INTERRUPTION OR LOSS OF SERVICES, BUSINESS OR GOODWILL, LOSS OR CORRUPTION OF DATA, LOSS RESULTING FROM SYSTEM OR SYSTEM SERVICE FAILURE, MALFUNCTION OR SHUTDOWN, FAILURE TO ACCURATELY TRANSFER, READ OR TRANSMIT INFORMATION, FAILURE TO UPDATE OR PROVIDE CORRECT INFORMATION, SYSTEM INCOMPATIBILITY OR PROVISION OF INCORRECT COMPATIBILITY INFORMATION OR BREACHES IN SYSTEM SECURITY, OR FOR ANY CONSEQUENTIAL, INCIDENTAL, INDIRECT, EXEMPLARY, SPECIAL OR PUNITIVE DAMAGES, WHETHER ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT, BREACH OF CONTRACT, TORT (INCLUDING NEGLIGENCE) OR OTHERWISE, REGARDLESS OF WHETHER SUCH DAMAGES WERE FORESEEABLE AND WHETHER OR NOT WE WERE ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

YOU AGREE TO LIMIT ANY ADDITIONAL LIABILITY NOT DISCLAIMED OR DENIED BY ACINQ UNDER THIS AGREEMENT TO YOUR DIRECT AND DOCUMENTED DAMAGES; AND YOU FURTHER AGREE THAT UNDER NO CIRCUMSTANCES WILL ANY SUCH LIABILITY EXCEED IN THE AGGREGATE THE AMOUNT OF FEES PAID BY YOU TO ACINQ DURING THE THREE-MONTH PERIOD IMMEDIATELY PRECEDING THE EVENT THAT GAVE RISE TO YOUR CLAIM FOR DAMAGES.