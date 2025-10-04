What are the fees?
Operation	Fees
Sending via Lightning	0.4 % + 4 sat
Sending on-chain	mining fees (user-chosen)
Receiving via Lightning	0 (no fees)
Receiving via Lightning with insufficient liquidity	1% + mining fees
Requesting liquidity	1% + mining fees
Receiving on-chain	mining fees
Channel creation	1000 sat

To optimise your fees when using Lightning, check the Liquidity entry.

Which version of iOS and Android are supported?
Phoenix requires iOS 16.0 or later, or Android 8.0 or later.

Is there a 'Testnet' version of Phoenix?
Yes, but only for Android. It uses Testnet coins that have no value, and is only useful for development and testing. You can download it here.

A Testnet4 version will be released soon™.

Trust and Privacy
Is Phoenix a "real" Lightning node?
Yes. Phoenix is a real, self-contained Lightning node that runs on your phone. It does not require you to run another Lightning node at home or in the cloud. It is not a custodial wallet either, you are in full control of your funds.

Is Phoenix trustless?
Phoenix is trust-minimized, but not trustless. Wise people know that there is no such thing as trustless and that it's all a matter of trade-offs.

The creation or modification of a channel:

When it is caused by an incoming Lightning payment, requires trust until the funding tx is confirmed. However the entirety of funds can always be spent at all time, even if the funding transaction is unconfirmed.
When it is caused by an on-chain deposit, does not require trust. This is because Phoenix directly funds the transactions.
Swaps are trustless.

You can configure Phoenix to use your own Electrum server to watch the Blockchain and monitor your channels. This significantly reduces your dependency on third parties to secure your wallet.

How private are my payments on Phoenix?
The current version of Phoenix offers no advantage regarding privacy over existing, hosted, custodial wallets. We (ACINQ) know the final destination and amount of payments.

Later versions will be much more privacy friendly, but that's in the works. More details here and here.

What happens if ACINQ disappears?
If ACINQ (or even the whole Lightning Network) completely disappears overnight, your funds will still be safe, but you won't be able to make any payments.

In that case, and only in that case (a catastrophic scenario where ACINQ disappears), you will need to force close your channels. For all other issues, bugs, problems of any kind, do not force close your channels, just get in touch with support (phoenix@acinq.co).

Let us say it again: Force-closing channels is an emergency mechanism to be used only as a last resort. High fees apply, and the procedure takes days to complete.

If you choose to proceed, go to Settings > Danger zone, and click on "Force close channels". Phoenix will unilaterally close your channels, and after a 720 blocks delay (~ 5 days) your funds will be moved back on-chain. Follow this procedure to recover your funds. Do not uninstall the app or reset its internal data until you have successfully recovered all your funds!

Lightning payments
Is there a minimum receiving amount?
No, but a mining fee will be required if you don't have a channel already. If the fee is too high, the payment will be rejected.

What is inbound liquidity?
It is the amount that you can receive within your existing channel, without incurring any fee.

As an analogy, suppose that your wallet is a bucket, and your balance the amount of water in the bucket:

Receiving = adding more water
Spending = pouring water out
If you keep adding water, the bucket will fill up. To receive more water, you will need a bigger bucket. When the bucket needs to be resized, that's an on-chain operation and mining fees need to be paid.

In reality, the bucket is a Lightning channel, the bucket's size is the capacity of the channel. The amount of water that can be added to the bucket before overflowing is the inbound liquidity of the channel.

You can visualize your current inbound liquidity in the channels screen.

Depending on your use case, if you know you are going to receive more than spend, then it makes sense to request inbound liquidity in bulk ahead of time. It allows you to hit the chain less frequently and save mining fees.

How is my current inbound liquidity computed?
You may have a channel with a balance of 5 000 sat and a capacity of 25 000 sat. However that does not mean you can receive 20 000 sats on this channel: its incoming liquidity is less than that.

Some of the channel's funds are "locked" as required by the Lightning protocol, for security reasons (mostly to pay the on-chain fees in case of a unilateral close and to maintain a channel reserve on the ACINQ side). The amount locked varies with the on-chain feerate and can be significant. In-flight Lightning payments also temporarily consume liquidity.

What happens after a year of reserving liquidity?
Short answer:

After a year, the channel will simply revert to default behavior, which is that part or all of the unused liquidity may be claimed back anytime by your counterparty (ACINQ). Claiming back liquidity doesn't close the channel and doesn't change your balance. Note, just because ACINQ has the option to do so doesn't mean that we will exert it, and indeed we typically don't. In particular, we have no incentive to do so if mining fees are high or if the channel is actively used.

Longer answer:

Requesting liquidity means that you expect to be receiving funds in the future and request your counterparty to add funds to their side of the channel. When the expected payments arrive, funds are available and ready to be pushed to your side of the channel, with zero on-chain footprint (and zero mining fee).

Or, according to the metaphore used above, requesting liquidity means that you are ordering a large bucket, much larger than what is needed to contain your current balance, because you expect to receive more water in the future.

Reserving liquidity doesn't mean that you are borrowing funds, that needs to somehow be repaid in the future lest something bad happens. It doesn't affect your balance. It affects the balance that belongs to your counterparty.

When you reserve liquidity, your counterparty allocates a certain initial amount of funds to the channel, and promises to keep it in the channel, even if the channel stays idle because you are not actually receiving payments. After one year, the counterparty is free to dispose of their own funds again.

Can I cancel an outgoing pending payment?
Lightning payments are routed between Lightning nodes before reaching their destination. If an intermediate node or the recipient node becomes unresponsive, the payment will remain pending.

Pending payments cannot be cancelled by Phoenix. They will expire by themselves after a while. Make sure to have your phone turned on and connected to the internet during the next few days. Our system will automatically wake up Phoenix to properly settle any pending payments. Failing to do so will cause your channels to be force closed.

Incoming payments are rejected because of fees, what can I do?
Phoenix is self-custodial, which means that sometimes on-chain operations are required to receive payments. When that happens, mining fees are due. Those are volatile and can be very high when the Bitcoin network is busy.

By default, Phoenix will reject incoming payments if the fee is more than 5000 satoshi (or 50% of the amount). More precisely:

If the payment was sent over Lightning, funds will be returned to the sender.
If the payment was sent on-chain, funds will remain in your wallet, waiting to be swapped.
If you are fine with paying more fees, you can change the max acceptable fee in Settings > Channel management to a higher value.

On-chain payments
Where is my on-chain balance?
There is no on-chain balance. Phoenix is a pure LN wallet, all your funds are always in channels.

You can still send and receive on-chain payments with swaps, they are completely transparent. Just scan a QR code, it will work.

The only time where we have to go on-chain is if serious issues happen (cheating attempts, bugs, protocol violations...), causing force-close of channels. This should never happen™. But if it does, see how to deal with it.

Can I deposit funds on-chain to Phoenix, and how long does it take before I can use it?
Yes, Phoenix provides a standard bitcoin address. As soon as the transaction to this address is published, Phoenix will notify that you have incoming funds.

The incoming transaction needs to reach 3 confirmations, and then it will be swapped to Lightning if the mining fee is below a max value that you configure.

If the mining fee exceeds your configured maximum fee, the swap is put on hold and will be re-attempted later.

I sent funds on-chain to Phoenix, why are they displayed as pending Clock?
The on-chain transaction needs to reach 3 confirmations before funds are available to Phoenix. Depending on network conditions you may need to adjust your fee.

I sent funds on-chain to Phoenix, why are they displayed as sleeping Zzz?
Phoenix is a Lightning wallet, funds need to be loaded into Lightning to be usable. When funds are sent on-chain to Phoenix, they are received in a "swap-in wallet", controlled by Phoenix. After they reach 3 confirmations, they will automatically be loaded to Lightning (a.k.a "swapped").

If the funds cannot be loaded to Lightning now, the swap will automatically be attempted later. In the meantime, they will be displayed as sleeping, with a "Zzz" icon, but they remain under the control of Phoenix in that state.

Reasons for not being able to swap funds include:

automated channel management has been disabled (see Settings > Channel Management)
mining fees required for the swap are above the max allowed value (see Settings > Channel Management)
the amount is too small (< 546 sat).
In any case, at that point, funds are under your control and are safe, even if they cannot be immediately loaded to Lightning.

Is my on-chain address rotated?
Yes, since version 2.2 (on Android and iOS) and the support of taproot addresses.

In addition to rotating addresses, Phoenix uses a taproot script that makes swaps appear as regular transactions, unrelated to Lightning or Phoenix. See our blog post for details.

Can I set the feerate when sending on-chain?
Yes, and you can also bump it later to speed up confirmation time.

Restoring a wallet
I've changed or lost my phone. How can I restore my wallet?
Just reinstall Phoenix, choose "Restore my wallet", then enter the 12-words seed, and you will be back in business.

You can then uninstall Phoenix on your old device.

Note that on Android, the payments history will not be restored on the new device.

Can I restore my Android wallet on an iOS device or vice versa?
Yes, you can.

However, the payments history will not be moved between iOS/Android.

Also, note that these two devices should NOT run at the same time.

Can I restore a regular on-chain wallet on Phoenix?
Phoenix will accept any valid seed generated by classic Bitcoin wallets. However, the on-chain funds on that seed will not be visible inside Phoenix.

Phoenix is only able to restore and use funds in Lightning channels that were established with Phoenix.

Limitations
Can I run two Phoenix apps with the same seed?
Running simultaneously two apps on the same seed is not recommended, because channels will be shared between the two instances. This could cause issues and payment channels might close.

Note: to recover funds from force-closed channels, follow these instructions.

Can I connect to any node? Can I connect to my own node?
Phoenix has been designed for less technical users, who don't know or want to run an always-on Lightning node on a server or to manage channels, with sensible trade-offs for those users.

There is some trust involved with Phoenix, which would make connecting to random nodes on the internet unsafe.

On the other hand, if you have the technical knowledge to run your own always-on Lightning node (therefore removing the trust assumption), then you do not need other trade-offs made with Phoenix and would be better off with a "remote-control" app to your Lightning node. This is a valid setup for more advanced users, who are not the target audience for Phoenix.

Is Phoenix affected by high on-chain fees?
Sending payments over Lightning is not affected by high on-chain fees.

However, there are some features of the wallet that require on-chain transactions:

Incoming on-chain payments (and some incoming off-chain payments) may be more expensive than usual. They may even be rejected to avoid excessive cost, depending on your configuration. See this entry for details.
Paying on-chain addresses may be more expensive than usual, but you can set you own feerate when paying.
Why do I need Google services on GrapheneOS?
Phoenix relies on Google Firebase Cloud Messaging (FCM) to deliver wake-up notifications to Phoenix. This allows you to receive payments even when Phoenix is in the background, or closed. It is also used to settle pending payments and prevent force-closures.

On GrapheneOS, by default there's no Google services, so these notifications won't work as-is. To fix that, GrapheneOS provides a sandboxed Google Play Services app that must be installed manually.

If you do not want to install this sandboxed app, then Phoenix will not receive the wake-up notifications. Phoenix will work fine as long as the app is active, but if it's in the background or closed, payments might fail. As a workaround, you can tweak the battery settings for Phoenix, so that it's not eagerly killed by the OS. With some luck, it's possible to avoid most issues with background payments (though that won't help if Phoenix is closed).

Troubleshooting
My channels got force-closed, how do I recover my funds?
First, do not uninstall the application (or reset its internal data) as long as you have not yet recovered your funds.

Second, note that if your channels got force-closed, there will be a delay (typically 720 blocks, or ≈ 5 days, but it can be more) before your funds are available.

Phoenix will show the closed funds in the "Final wallet" screen, in Wallet Info. Once they've confirmed, you'll be able to send these funds to any on-chain address you want.

You can also perform the recovery manually. Phoenix uses a standard BIP39 seed with a standard BIP84 derivation path ("native segwit (p2wpkh)"). Any compliant wallet will work. We recommend using Electrum (desktop).

Receiving or sending payments keeps failing, what can I do?
Make sure you have a reliable connection. Public WiFi (like hotels, airports, offices) are often misconfigured.

Enabling Tor in Phoenix can also cause failed payments.

If you specifically have trouble receiving payments, keep the app visible in the foreground. A common scenario is users switching between Phoenix and other apps when the payment is on the way. Doing that can disconnect Phoenix on some devices (Samsung, OnePlus, Huawei), and fail the payment. On iOS, make sure that the Notification Center is enabled in the iOS settings for Phoenix.

Some Lightning nodes also have limited liquidity and cannot be paid. Such issues cannot be solved from Phoenix, but you can try reaching out to the node operator so they improve their setup.

I sent funds on-chain to a Phoenix 1.x legacy on-chain address, are my funds lost?
No, just get in touch with support (phoenix@acinq.co) and provide:

the legacy receiving address (that you sent bitcoins to)
your current receiving address
your node id(s) (in Settings > Wallet Info)
Why is my on-chain address invalid?
Phoenix uses a modern format (p2tr) for its Bitcoin addresses. It is cheaper and more private. However, some outdated services or wallets do not understand that format and will tell you the address is invalid.

In that case, if you really need to use those services, you can configure Phoenix to use the Legacy format (p2wsh), which they should understand. To do that, check the Payment options in your Settings, or use the Edit button in the Receive screen.

Bumping on-chain fees does nothing?
There are two ways of bumping fees in Bitcoin: replace-by-fee (RBF) or CPFP (child pays for parent).

Phoenix uses CPFP: a child transaction is created with higher fees, which indirectly increases the fee for the parent. The parent's fee is not changed directly, but the parent will confirm faster.