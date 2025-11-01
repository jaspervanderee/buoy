What is Aqua?
AQUA is a non-custodial Bitcoin and stablecoin wallet built for speed, privacy, and simplicity. It supports Bitcoin (BTC), Liquid Bitcoin (L-BTC), and USDT across multiple networks—including Liquid, Ethereum, Polygon, BNB Smart Chain, and Tron—via swaps.
You hold your own keys, and no signup or KYC is required. Just download, create a wallet, and go.



What is Tether USD (USDt) and how does It work in AQUA?
Tether (USDt) is a cryptocurrency designed to stay equal in value to the US dollar. Unlike Bitcoin, its price doesn’t fluctuate—holding USDt means holding digital dollars.

AQUA Wallet natively supports USDt on the Liquid Network. To interact with USDT on other networks like Ethereum, Polygon, Tron, and BNB Smart Chain, AQUA integrates with swap providers such as SideShift and Changelly.

For USDt on networks other than the Liquid Network, like Ethereum, Polygon, Tron, or BNB Smart Chain, AQUA uses a third-party service (like SideShift or Changelly) to convert your Liquid USDt into the right network before it gets there.

For example, when you use AQUA to send USDt on the Ethereum network, what happens behind the scenes is that you send USDt on the Liquid network to a wallet controlled by a swap provider (like SideShift or Changelly), and the swap provider will in turn send USDt on the Ethereum network to its final destination. 

Conversely, when you use AQUA to create an address to receive USDt on the Ethereum network, the address you generate in the app is owned by a swap provider (SideShift or Changelly). When USDt on Ethereum lands in that receiving address, the swap provider will then send USDt on the Liquid network to an address in your AQUA wallet, where you control the keys.  




Your seed phrase: what it is and how It works in AQUA
Your seed phrase is a set of 12 words you get when creating a new wallet in AQUA. It’s the only backup you need to recover your funds if your phone is lost, stolen, or reset.

This seed phrase lets you recover both bitcoin (BTC) and Liquid assets like L-BTC and Liquid USDT.

If AQUA ever disappears, your money is still safe. The app uses open standards and open-source libraries. That means your seed phrase will still work in any other wallet that uses the same derivation paths. You aren’t locked in. As long as you know the paths AQUA uses, you can recover your funds anywhere.
 
Derivation paths used in AQUA:

Bitcoin: BIP84
Liquid: BIP49
You can also restore your AQUA seed phrase in other wallets including Blockstream App and Electrum.

Keep your seed phrase safe. Write it on paper. Don’t take a photo. Don’t store it in the cloud. Don’t share it with anyone. If someone gets your seed phrase, they can take everything.

AQUA does not let you import a seed phrase from another wallet. You can only use a wallet created inside AQUA.



What is the Bitcoin Chip feature?
While using your AQUA wallet you may have seen a "Bitcoin Chip" feature under your Settings menu. Bitcoin poker chips are promotional tokens made by our CEO Samson Mow. You can see what they look like right here:

Bitcoin or USDt poker chips contain a public key that can be scanned using the Bitcoin Chip function in your AQUA wallet in order to verify the balance stored in them.

The private key contained inside the Bitcoin or USDt chips can be scanned or "sweeped" by peeling away the QR sticker on the poker chips, which will reveal the actual private key containing the funds. The sweep function is yet to be enabled in AQUA, but it will become available in a future update.

Bitcoin Chips are very similar to older Casascius coins, so unused poker chips may appreciate in value even more that the Bitcoin or USDt they contain. Considering this, you might want to store it as a collectible instead.



Is AQUA Open Source?
AQUA wallet's non-custodial core is fully open-sourced. Our repositories can be found at: https://github.com/AquaWallet?ref=jan3.com

While the AQUA Marketplace remains fully open-sourced as well, future versions of AQUA will include proprietary close-sourced code only relevant to our Marketplace offerings.

It is our long-term commitment to maintain the core features that make up AQUA as open-source software.



Does AQUA support Replace-By-Fee (RBF)?
Yes! AQUA supports RBF, which lets you speed up a pending Bitcoin transaction by increasing the fee.



Are AQUA transactions RBF-enabled, and how can I adjust the fees If needed?
Yes, AQUA transactions are RBF-enabled. If your transaction is waiting to be cleared through the mempool due to a low fee, you can adjust the fees and expedite your transaction. Simply select the transaction in your AQUA Wallet and choose the RBF (Replace-by-Fee) option to increase the fee.



Should I pay USDt network fees with L-BTC or L-USDt?
When sending L-USDt from your AQUA wallet, you have the option to pay network fees with L-BTC or L-USDt. So, which one should you choose?

In general, it is better to pay L-USDt network fees with L-BTC. The ability to use L-USDt to pay network fees is added for convenience when you don't have any L-BTC in your wallet.

There are two main advantages to paying your network fees with L-BTC:

1. It is cheaper.

2. You will have the ability to unblind all inputs and outputs of the transaction. If you pay L-USDt transaction fees with L-USDt, the transaction will be routed through SideSwap, and therefore some of the inputs and outputs will be blinded. 

*If you ever need a fully unblinded transaction link for a L-USDt transaction, but you have paid the network fee with L-USDt, you must reach out to SideSwap to request the unblinding data. 




What are the fees on AQUA
AQUA does not impose any additional fees on transactions. It functions as a liquid assets and Bitcoin wallet, meaning the only fees you pay when using it are standard network fees associated with Bitcoin and Liquid transactions. However, certain features in AQUA, such as swaps or Lightning transactions, may involve fees from third-party service providers.

What Other Fees Should I Be Aware Of?
While AQUA does not impose fees, certain transactions involve third-party providers that do charge fees.

Tether USDt
USDT transactions (except for USDT-Liquid <-> USDT-Liquid) involve a swap, which incurs fees based on the swap provider used (currently, swap providers are selected automatically by the app, but soon, users will be able to select the swap provider themselves):

SideShift: 0.9% + network fees

Changelly: 0.9%  + network fees

*Note about USDt Network Fees:

The network fees shown during a swap aren’t standard blockchain fees paid to miners or validators. They’re set by the swap providers (Changelly or SideShift) to cover the cost of moving funds between their internal wallets. These may be slightly higher or lower than the actual on-chain fees. AQUA doesn’t control or receive these fees.

Lightning
When sending via Lightning, you are performing an L-BTC to Lightning swap through Boltz. The associated fees are:

Sending Lightning from AQUA: 0.1% + LBTC Network Fees

Receiving Lightning in AQUA: 0.25% + LBTC Network Fees

L-BTC to BTC (Peg-ins & Peg-outs)
Peg-ins and Peg-outs are transactions that bridge Bitcoin and Liquid Bitcoin (L-BTC). These are facilitated by SideSwap and have a 0.1% fee (+ network fees).

 
L-BTC to L-USDt Swaps
Swapping L-BTC for L-USDt is done via SideSwap and incurs a 0.6% fee + network fees.

For any transaction in AQUA, be sure to check the fees applied by the respective providers before proceeding.




Are there limits on the amount of funds I can send or receive with AQUA?
AQUA is a non-custodial wallet, so we don't limit the amount of funds you can move. However, for sending or receiving USDT on chains other than Liquid, the maximum amount depends on swap providers' liquidity.
For any asset natively supported by AQUA, you can move as much money as you want without any restrictions.




Understanding AQUA-to-AQUA lightning transactions
When you send or receive a Lightning payment between two AQUA wallets, the transaction doesn’t actually go over the Lightning Network. Instead, it’s automatically settled on the Liquid Network as an L-BTC transaction.

Why does AQUA do this?
Using Lightning normally requires an atomic swap. If AQUA were to swap twice (once to Lightning, once back to Liquid), it would add extra steps, higher fees, and slower settlement. To avoid that, AQUA just processes the payment directly on Liquid.


What this means for you
Transactions are still fast and reliable.
They appear in your wallet history as L-BTC transactions.
Fees are lower because no extra swap is needed.
 
In short: AQUA-to-AQUA Lightning payments are automatically optimized to settle on Liquid.


Which transactions are swaps in AQUA?
What Counts as a Swap in AQUA?
AQUA supports both regular transactions and swaps. Understanding the difference helps you know what to expect in terms of speed, fees, and reliability.

Regular Transactions (Not Swaps)
These are simple sends or receives on the same network.

They don’t involve third parties and are typically faster.

Examples:

Sending or receiving BTC on Bitcoin mainnet
Sending or receiving L-BTC, L-USDT, or any other Liquid asset on the Liquid network
As long as the asset stays on its native network, it’s not a swap.


Swaps
Swaps involve moving assets across networks, or using third-party services to process the transaction.

Swaps include:

Lightning transactions (sending or receiving)
Peg-ins (sending BTC from mainnet into AQUA)
Peg-outs (sending BTC from AQUA to a mainnet BTC address)
Sending or receiving USDT on any network other than Liquid
Paying Liquid network fees with L-USDT
(This triggers a micro-swap via SideSwap behind the scenes)




What networks or chains does AQUA support for USDt?
AQUA natively supports USDt on the Liquid Network, but with swap providers, you can also send and receive USDT on:

• Ethereum 

• Polygon

• Tron

• Solana 

• Binance


⚠️ Available assets may vary depending on the swap provider you’re automatically connected to. Soon, AQUA will allow users to manually choose their own swap provider. Always double-check the destination chain to avoid losing your funds.




How does Lightning work in AQUA?
AQUA is a native Bitcoin and Liquid wallet. However, it does support receiving or sending Bitcoin via Lightning. Despite this, your AQUA wallet only holds Bitcoin and Liquid assets, so when you send a Lightning transaction, it is funded from your Layer 2 Bitcoin (L-BTC).

AQUA sends Bitcoin on Lightning via submarine swaps that run through Boltz. When your AQUA wallet shows a "Lightning Payment in Process" this means that the Layer 2 Bitcoin (L-BTC) has gone out of AQUA to Boltz, Boltz is trying to pay the invoice to the destination wallet, and for some reason it has not finished yet.

There are two important things to consider during this process:

If Boltz cannot pay it in a certain time window, the user's funds will be automatically refunded in AQUA.
Should the automatic refund fail, AQUA users can claim the money back by clicking the “Refund” button that will appear on screen.
In case a payment does not go through and you want to diagnose exactly why the payment is not succeeding from Boltz's end, you can contact Botlz at hi@bol.tz — When doing this, make sure you include your Boltz swap ID in the email.




What's Direct Peg-in and how does It work?
Direct Peg-in is an advanced feature in AQUA Wallet. When enabled, a Direct Peg-in button appears under L-BTC → Receive. Selecting it generates a BTC address, allowing you to send bitcoin directly and receive L-BTC in your AQUA L2 Bitcoin account. This eliminates the need to pay main chain fees twice—once for sending BTC to AQUA and again for swapping BTC to L-BTC.



Are Direct Peg-In addresses reusable?
No, Direct Peg-In Addresses are not reusable in AQUA. 



What Fiat-to-Bitcoin Providers Are Available to Buy Bitcoin via Meld?
A list of The fiat-to-bitcoin providers available on Meld can be found on their website at https://www.meld.io/integrations. provider availability may vary depending on location. 





How do I get an unblinded transaction link for My L-USDt transaction?
To ensure you can unblind all inputs and outputs of a L-USDT transaction yourself, you need to pay the network fee using L-BTC, and NOT L-USDt. If you have already sent USDt and paid the network fee with L-USDt, you can still get the unblinded transaction link, but you will need to reach out to SideSwap.io/support to get the unblinding data as the transaction is routed through SideSwap when L-USDt is used to pay network fees.

Lockdown Mode:
If your phone is in Lockdown Mode, it may block certain features, including the ability to view the unblinded transaction link. To access the link, try disabling Lockdown Mode temporarily.





Why is my Peg-in or Peg-out taking longer than usual?
AQUA uses SideSwap to handle Peg-ins and Peg-outs between Bitcoin and Liquid Bitcoin (L-BTC). Most of the time, SideSwap completes these instantly using liquidity from its hot wallet.

However, sometimes SideSwap’s hot wallet runs out of liquidity. When that happens, your transaction has to take the slow route, a full peg transaction on the Liquid Network.

This process requires 102 Bitcoin confirmations (roughly 17 hours) before it completes. 

We’re working on:

Adding a warning in AQUA to let you know when a transaction will use the slow route.
Introducing a fallback system so that even when SideSwap’s hot wallet is low, AQUA can avoid unnecessary delays.
If your Peg-in or Peg-out is still pending, it’s most likely just waiting for those confirmations to complete.




I Can't Build AQUA from Source
Currently, it’s not possible to build AQUA from the public source code on GitHub. While AQUA’s non-custodial core is open-source, certain Marketplace features like the Dolphin Card and Buy Bitcoin depend on closed-source code that isn’t published to GitHub. This dependency is causing the build to fail. 

To address this, we’re working on separating out the Marketplace code so that a fully reproducible, non-Marketplace version of AQUA can be built from source and released on F-Droid.




My Transaction Was Confirmed on the Blockchain, But I Don’t See the Funds in My Wallet
First, force close and reopen the AQUA app. That usually fixes it.

Next, figure out if the transaction was a swap or a regular send/receive:

If it was a regular transaction on the same network (like BTC, L-BTC, or L-USDt), and it’s confirmed on the blockchain, AQUA or your receiving wallet should show it. If it doesn’t after restarting, email us at support@aqua.net with your transaction ID.

If it was a swap (which includes any transaction involving USDT on a network other than Liquid) , you’ll need to check who the swap provider was and reach out to them:

For USDt swaps: go to Transactions, tap the clock icon twice in the top right, scroll to your swap, tap it, then tap Customer Support at the bottom.

For Lightning swaps (any lightning transaction): contact hi@bol.tz with your swap ID or details.

For Liquid-based swaps (pegging in/out, swapping BTC <-> L-USDT, or paying fees with L-USDt): visit SideSwap.io/support and submit a ticket.

If you’re not sure or something looks stuck, feel free to reach out to us and we’ll help guide you.




I Can't Empty My L2 Wallet by Sending Lightning.
Currently, the only way to fully drain your AQUA wallet’s L2 balance is by either sending all your L-BTC to another wallet or swapping all your L-BTC to BTC within the app
AQUA retains a small amount of sats in the wallet to cover potential refunds in case a Lightning payment fails.




I Can't Restore My AQUA Wallet Seed Phrase
Please first remember to securely store your seed phrase, as it is crucial for ensuring the safety of your funds and facilitating their recovery if needed.

If you encounter issues restoring it on your phone, consider these steps, for troubleshooting: 1 close the app and reopen it; 2 update your AQUA wallet; 3 uninstall AQUA (DO NOT forget to have your seed backed up in written form before doing this) and then try installing the latest version.

If you still cannot restore your AQUA wallet using your 12-word recovery phrase, please contact support at support@aquawallet.io




Why Can't I Buy Bitcoin in My Region?
Bitcoin purchases are managed by a third-party provider, which has varying country and zone restrictions, as well as different KYC (Know Your Customer) policies. If your purchase was declined, there might be a restriction related to your country or your bank.

If your payment was successfully processed but the Bitcoin has not yet been received, or should you experience any other issues, please contact the specific third-party seller that was assigned to you when trying to buy Bitcoin in AQUA.




My Bitcoin Transaction or Swap is Stuck or Hasn't Confirmed
Whenever your AQUA wallet shows a transaction that has not yet been confirmed, first you will need to check its current status. To do this, you can head to https://mempool.space/ or https://blockstream.info/ explorers and search for your TxID to confirm what has happened to your transaction.

If it's still unconfirmed you can check the average fee required for a transaction in the same two same Bitcoin explorers. When the fee used for your transaction was too low, this is most likely what may have caused for it to remain stuck in the mempool. 

If this is the case, you can increase the required fee from your AQUA wallet to speed up the transaction, or wait for your transaction to either clear through the mempool or for it to be purged, at which point your funds will be returned to your AQUA wallet.

As a general tip, try to always choose a medium or high fee so your transaction gets in the next block, especially if you are not well versed in how Bitcoin transactions work.

  



Importing Seed Phrases from an Old AQUA Wallet
AQUA was originally launched in 2020 by Blockstream, and only on iOS. In 2022, JAN3 overtook development of the AQUA software to improve upon the original idea, and ultimately, relaunched a new AQUA on January 3, 2024.

Some users that tried out the previous AQUA may prefer to restore their old wallets in this new version of the app, but doing so will result in them seeing their Liquid assets perfectly restored while their onchain Bitcoin balance is missing. Worry not, your Bitcoin balance is safe.

The previous iteration of AQUA was not compatible with SegWit addresses, whereas JAN3's AQUA does support SegWit (read more about derivation paths here). For this reason, the old seed or recovery phrase won't be able to properly restore your balance in the new AQUA.

AQUA users can fix this problem by using two different methods:

Simply sending all previous funds from their old Blockstream AQUA wallet into the newly installed app made by JAN3.
The older recovery phrase can be imported onto a wallet that is compatible with both types of addresses, such as Blockstream Green, where the users will be able to view and transfer their on-chain balance.




I sent a Lightning transaction but It wasn't received (see Strike & Muun)
As explained in other articles, sending and receiving Lightning transactions is done using submarine swaps from/to Layer 2 Bitcoin (L-BTC).

These trustless swaps are carried out via Boltz in the backend, and while the vast majority of AQUA Lightning transactions will be successful, some issues can arise (see errors receiving Lightning in AQUA). As of now, sending a Lightning transaction to a Strike account can cause the transaction to show as if it has failed, whereas in reality, the funds have been successfully received by Strike. This a known issue for the AQUA, Boltz, and Strike teams, and it’s currently being worked on.

Similarly, Lightning payments to Muun Wallet (which also uses submarine swaps, albeit with on-chain Bitcoin) have been known to be affected by excessively long delays too. AQUA and Boltz developers are also looking into this matter.




Privacy & Security
Does AQUA collect any data from Its users?
Since its launch on January 3, 2024, AQUA has followed a strict privacy-first approach. By default, AQUA does not collect or store any user data—whether on iOS or Android.

As of 2025, users can optionally create a JAN3 Account to access certain services, such as the Dolphin Card. To do so, they provide an email address, which we store securely. No password is required—login is handled via a one-time 2FA code sent to the user’s email.

Outside of this opt-in account system, AQUA does not log activity or collect data. The apps don’t send analytics or usage data to any servers. However, when interacting with third-party services (e.g., Zendesk support), users may be asked to provide additional information governed by that provider’s privacy policy.




How does AQUA store my seed phrase?
AQUA is a non-custodial Bitcoin and Liquid wallet, therefore it is the user's sole responsibility to safeguard access to the funds and the device on which they install AQUA.

If you use AQUA, our wallet software will use an algorithm to generate a random 12-word phrase as a seed to a BIP32 hierarchical wallet. This 12-word phrase is called a recovery phrase (or mnemonic phrase). If reproduced exactly, this phrase stores all the information needed to recover your Wallet if access through fingerprint authentication or any other means the device provides for you is lost or otherwise unavailable.

AQUA does not store, have access to, or have any way of retrieving your recovery phrase for you. It is your sole responsibility to keep your recovery phrase secure. You should not give it to anyone, not even AQUA representatives.

However, your AQUA wallet does store the recovery phrase (mnemonic phrase) used for your wallet securely on your device. This is stored in the Keychain on iOS and in your EncryptedSharedPreferences on Android. AQUA does not make use of a passphrase to generate your recovery phrase.

For this final reason, if your device is compromised, physical or network access to your device may be enough to access or brute force into your AQUA wallet. You are again solely responsible for safekeeping any devices on which you install AQUA.




What Is the Dolphin Card?
The Dolphin Card is a privacy-preserving VISA® card that lets you spend your Bitcoin directly from AQUA. It’s primarily designed for online, in-app and over-the-phone purchases, but it can also be used in-store where merchants allow manual entry of card details.

You fund the card by depositing BTC, L-BTC or USDt in your AQUA wallet to top up your balance. After two network confirmations, the amount you top up is converted into USD, ready to spend.

Once you’ve added funds, the Dolphin Card works just like any other VISA® credit card. You can use it for one-time purchases or set it as a default payment method for recurring charges like subscriptions and delivery apps.

You can track your spending and view card details directly from AQUA. 

The Dolphin Card is now live in version 0.3.5 on Google Play and the Apple App Store for beta testers who were previously whitelisted. We’ll soon add another group of testers before launching the card to the public.




Known issues and limitations (beta)
Apple and Google Wallet not supported

The Dolphin Card cannot be added to Apple or Google Wallet at this time. We’re exploring support for future updates. 

3DS Payments in Europe

3DS Payments in Europe are not currently supported.

Verification code not received
A few users haven’t received the verification code needed to log into their JAN3 account. Try resending the code. If it still doesn’t arrive, contact support.

Restricted categories of spending

Some categories of transactions are not supported. You can view the list of restricted spending categories here.

Your payment may be declined if you don't have enough balance to cover fees.

Ensure you have enough balance to cover fees, and that you have not reached your monthly spending limit, or your transaction will be declined. 
 

PayPal authorization holds may get stuck in a pending state

Some users have reported an issue after linking the Dolphin Card to a PayPal account where the small (less than $1.00) authorization transaction doesn’t get refunded. If this happens, please contact support at least ten days after the transaction was made. 

Amazon checkout shows amount in MXN

After setting the Dolphin Card as your default payment method on Amazon, totals may appear in Mexican Pesos (MXN). You can change the currency to your native currency and this should not affect your purchases. 

Potential issue with transactions that have been updated with replace-by-fee

When you start a Dolphin Card top-up with BTC or L-BTC, the exchange rate is locked for 20 minutes. If the transaction isn’t confirmed within that time, the rate from the original broadcast applies. But if you later use Replace-by-Fee (RBF) to raise the fee after the 20-minute window, the system will treat it as a new transaction; if the price has fallen, it can appear underfunded. If this happens, just contact support and we will process the top-up. 

Regional restrictions

Due to compliance and provider limitations, some regions are currently unsupported. If you’re in a restricted location, you may see an error when creating or using the card. For the latest list of supported regions, click here.


