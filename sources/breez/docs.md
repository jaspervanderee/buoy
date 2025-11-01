Introducing Breez Mobile
Breez is a full-service, non-custodial Lightning client. Let’s break that down:

Lightning is a bitcoin payment network that reduces transaction times from minutes to milliseconds and transaction fees from several dollars to a few cents or less. Lightning turns bitcoin from digital gold into digital currency while preserving all of the benefits that make bitcoin great.
Non-custodial means that Breez doesn’t take possession of users’ money. Many Lightning clients do take possession of their users’ money. They’re basically bitcoin banks. With a non-custodial app like Breez, all users are their own banks. Breez uses a forked version of lnd and Neutrino. The Breez app actually runs a full Lightning node under the hood. Advanced users can interact with the underlying Lightning node by invoking lncli commands in the Preferences> Developers screen.
Full-service means that Breez takes care of almost all the technical operations automatically and in the background. Things like channel creation, inbound liquidity, and routing stay under the hood. (But Breez is also open source, so those interested in auditing the technology are welcome to do so!)
Breez includes a Point-of-Sale mode, which transforms the app from a Lightning wallet into a Lightning cash register with the slide of a finger, allowing everyone to become a merchant and accept Lightning payments. It also includes a next-generation podcast player, allowing users to stream sats to their favorite content creators.

Note: the app is still in beta and there is a chance your money will be lost. Only use this app if you are willing to take this risk.

Features
No channel management: zero-conf channels are created on the fly
Breez seamlessly opens channels as needed on-the-fly. Here's how it works:

When the recipient wants to receive a payment but lacks inbound capacity, their Breez app recognizes the lack and issues two invoices using the same preimage: one invoice is issued to the sender (requesting a payment) and a second is issued to the Breez LSP. The amount of the second invoice equals the amount requested from the payer minus a miniscule service fee to Breez for opening the channel the recipient requires. The invoice sent to the sender includes routing instructions, indicating a pseudo-channel between the recipient and the Breez node.
When the sender pays the invoice they received from the recipient, the Breez node intercepts the payment and holds it.
The Breez LSP then opens a channel with the recipient and skips funding confirmation. Then it pays the recipient the second invoice and receives the preimage.
Once the preimage is received from the recipient, Breez settles the payment with the sender.
Breez funds the convenience of zero-conf channel creation by charging a fee.

The channels Breez creates on the fly are actually zero-conf channels. These differ from standard channels in that they can function before they’ve been confirmed on the blockchain. Instead of making users wait until blocks are mined, these channels become active instantly, allowing users to spend their funds immediately after receiving them.

Cloud backup
Like all true Lightning wallets, Breez is a "hot" wallet and thus requires frequent cloud backups. To avoid relying on the availability/existence of the Breez server, we offer automatic backups to Google Drive, iCloud, Nextcloud, or any WebDav server. From a security standpoint, there are also many advantages to saving these backups in a major third-party cloud-storage provider. For more information, see our Backup FAQ.

On-chain transactions
When sending or receiving funds via BTC addresses, Breez uses Submarine Swaps, which allow Breez to support on-chain transactions while maintaining a single balance. In other words, all of the users’ funds are in their Lightning channels, which simplifies the user experience by obviating many functions of a standard BTC wallet.

For more information, see:

Adding Funds via Submarine Swaps (Receive via BTC Address)
Reverse Submarine Swaps (Send via BTC Address)
On-chain monitoring
Breez uses Neutrino to fetch chain information. Neutrino provides better privacy than current alternatives and allows users to connect to their own Bitcoin nodes via the Preferences > Network screen.

Breez includes a background watcher to help users control the state of their channels. This process notifies users of cheating attempts even when the app is closed, helping them to retrieve their money. The refund period is 720 blocks, so users are automatically protected by simply using their phones at least once every 5 days. The Breez app doesn’t even need to be open, since the watcher runs periodically in the background without any further demands on the user.

Connecting to multiple nodes
By default, Breez creates channels on the fly with the Breez LSP whenever users lack the inbound liquidity to receive a payment. There are, however, several ways to create channels with other nodes in Breez: users can open a channel to their own node, use LNURL-Channel, or run lncli commands from the Developers screen. For more information, see here.

Point-of-Sale
Breez works like a digital cash register for brick-and-mortar businesses and merchants who want to accept Lightning payments. It includes features and a user interface tailored to merchants’ needs, like manager passwords, a catalog of items, fiat display, and the ability to export transaction information. Read this to get started with Breez POS.

Podcast player
Breez comes with a built-in, next-generation podcast player: users can find and subscribe to podcasts, stream payments while listening, and send real-time tips to applaud their favorite creators at their favorite moments. While listening, users can set a rate of how many sats per minute to stream back to the creators. For example, to pay 3000 sats for an hour-long episode, the user would set the rate to 50 sats/min. Setting the rate to 0 lets the user listen for free. Users can also send one-off tips to the creators by pressing the Boost! button and attach a direct message to the podcasters (aka Boostagrams).

For more information about Breez support of Podcating 2.0, read this article. To see streaming sats and boosts in action, check out this video.

Breez includes many more features, like full LNURL support, private mode, payment filters, Connect to Pay, biometric login, fast graph sync, scanning QR code from an image, fiat currencies and Lightning addresses. To learn more, please take a look at our medium publication, GitHub projects, or follow us on Twitter.



Troubleshooting Payment Failures
Breez is a non-custodial service that uses lnd and Neutrino under the hood. Routing is done on the client side using the graph information provided by lnd.

No route found/Unable to find path/Timeout
If you are trying to pay an invoice, but you see an error like no route found, unable to find path or timeout errors, please try the following:

Make sure you are running the latest version of the app.

Try a smaller amount to leave enough sats for routing fees (e.g. 1-2%).

Retry paying the invoice. lnd has a function called mission control in its routing algorithm. Mission control improves routing based on previous attempts, so simply retrying a payment might do the trick.

Make sure there is no limit set in Preferences > Lightning Fees.

Reset the Bitcoin Node by clicking the Reset button on the Preferences > Network screen.

Try refreshing the graph information. Click on three dots at the top right of the Preferences > Developers menu, then on Update Graph. Then re-open Breez, keep it in the foreground for a few minutes, and retry the payment.

Try refreshing the private channels. Click on three dots at the top right of the Preferences > Developers menu, then on Refresh Private Channels. Then re-open Breez, keep it in the foreground for a few minutes, and retry the payment.

Restart the Breez app and wait 30 seconds. Then, click on the getinfo command in the Preferences > Developers > General menu to check whether all the channels are active, which is the case when there's a "0" in the "numOfInactiveChannels" line.

Check that Breez has the latest graph information. You can verify this by clicking on the getinfo command in the Preferences > Developers > General menu. If the synced_to_graph line of the output indicates true, then your node is synced with the graph. In case the value is false, keep the app running in foreground for a couple of minutes until it syncs.

Try resetting mission control by running the resetmc command from the Preferences > Developers > Payments menu and retry the payment.

Advanced users can also debug the routing path by running the Developers > Payments > queryroutes command.



Backup FAQ
Important note
Restore your wallet only if you've lost your device or accidentally uninstalled Breez. Restoring from backup is unlikely to fix problems you may be experiencing with the app.

Does Breez have a backup seed?
Unlike an on-chain wallet, Breez requires continuous backups of the user's current channel states, which necessitates cloud storage (e.g. Google Drive, iCloud, Nextcloud, or any WebDav server) rather than a simple seed phrase to backup/restore. In Breez, an encrypted backup is triggered automatically after whenever a BTC address is generated or a Lightning payment event occurs.

Why does Breez require cloud access?
As a Lightning wallet, Breez requires continuous backups of the user's channel states backup to the cloud. From a security standpoint, there are many advantages to saving these backups in a major third-party cloud-storage provider. Even better, with cloud backup users' backup files don't rely on the availability of the Breez server.

Can Google/Apple access my backup information?
Neither company is fully transparent about their data encryption. That's why Breez offers an additional layer of encryption to data backed up in the cloud. To generate a backup phrase, activate Encrypt Backup Data in the Preferences > Security & Backup screen.

Why can't I restore my data in other wallets despite entering the correct encryption key?
Breez's encryption key is not the same as a seed phrase for an on-chain wallet. The Breez key encrypts the user's data stored in the cloud. In order to restore the information, users need access their cloud backups and decrypt them with their individual keys. Currently, Breez backups can only be restored from within the Breez app.

How do I restore from backup?
You can restore from backup inside the Breez app. You'll see a Restore from Backup link under the Let's Breez button on the opening screen. DO NOT RUN A PREVIOUS INSTANCE OF BREEZ AFTER RESTORING ON A NEW DEVICE.

Can I view the backup files in Google Drive/iCloud?
Backup files are stored in a private data directory accessible only through the Breez app. Google Drive users can manage their Breez storage by opening Google Drive in a browser and clicking on Settings > Manage Apps.

Can I switch from Android to iOS and vice versa?
Yes, by storing your backup in Google Drive or on a remove server that is supported on both platforms. To switch cloud provider, use the Store Backup Data in setting on the Preferences > Security & Backup screen.

Can I switch between Google Accounts for backups?
Yes, but switching accounts may require extra setup. Ensure you grant Breez the necessary access permissions, and disable two-factor authentication (2FA) if needed to avoid backup authentication errors.

I can't authenticate to Nextcloud. What can I do?
Create an app password, enter the new app credentials and retry. If the standard Nextcloud URL doesn't work, please try the following:

Go you your Nextcloud instance using your browser.
Select the Files pane.
Scroll down on the left bar and select File Settings.
Under WebDAV copy the URL and use it when attempting to sign in.
Do you support pCloud?
Yes, but a business account is required (with WebDav support). The URL should be entered in the following format:

pCloud (US): https://webdav.pcloud.com
pCloud (EU): https://ewebdav.pcloud.com
Breez says my key is wrong. What can I do?
If Breez says you're entering an incorrect key, then the key you are entering does not match what is saved in the software. Unfortunately, there are few means to recover a key that was recorded inaccurately. Please ensure that you've entered the words in the right order and that all the words are spelled correctly. More than once, the obstacle has turned out to be a small error in entering the words, even a single letter.



Opening Channels
By default, whenever a user lacks sufficient inbound liquidity to receive a payment, Breez creates a channel on the fly connected to the Breez routing node.

However, there are several ways in Breez to create channels with other nodes:

Opening a channel from a different node:

Use the getinfo_ command by clicking Preferences > Developers > General to retrieve the public key of the mobile node on your device.
Click on Preferences > Developers > Peers > connect to connect to another node. Note: for Tor nodes, you first need to enable Tor in Preferences > Network (Android only for now).
Open a private channel to the Breez mobile node from the interface of the new node using lncli or similar. Make sure Breez is running in the foreground on your phone while opening the channel.
Using LNURL-Channel (see below).

Running lncli commands from the Preferences > Developers screen.

Note: creating channels manually is recommended only for advanced users.

LNURL-Channel
LNURL-Channel allows users to use external services, like Bitrefill Thor, LNBIG, and other LSPs to open additional channels simply by scanning a QR code or clicking on a link. In order to use this function, you need to first choose a provider that offers channel-opening services.

Important note:

Channel reserve refers to the funds locked in a channel and that can't be transferred until it is closed. Different LSPs set different channel reserves. While Breez sets the channel reserve to 0 on its default channels, other providers will probably use the default setting of 1% of a channel's capacity.




Channel Closures
Payment channels on Lightning can be closed without the user actively closing them. This can happen, for instance, when a peer force-closes a channel. Unilateral force closures can result from, say, nodes on the network that hold funds rather than forwarding them, and the Breez LSP may close your channel after a period of inactivity (at least 45 days without executing a Lightning transaction). Furthermore, there are still bugs in lnd (the Lightning Network implementation Breez uses) that can cause inadvertent channel closures.

However, users never lose control of their funds (provided they are above dust value) even in the case of force closures. When a channel is closed, the funds are swept to an on-chain address. Typically, it takes 144 blocks (about 24 hours) before the funds from the closed channel appear in a user's local wallet. Once the funds appear in the user's local wallet, Breez displays an interface that allows the user to redeem them, and a warning icon will appear in the top right of the home screen. If no warning icon is displayed, it probably means that the process is still underway.

For more information regarding the closing process:

The Closed Channel transaction in the payments list should display a detailed status. Please wait 144 confirmations (about 24 hours) after the initial closed channel transaction, at which point the second, sweep transaction (i.e. the transfer from the closed channel to the local Breez wallet) should be displayed.
Consult the output of the pendingchannels command by clicking Preferences > Developers > Channels > pendingchannels.
'Pending Closed Channel' status seems stuck for a few days
Sometimes on-chain synchronization issues cause the sweep transaction to fail, and the process of closing a channel gets "stuck" at pending. To resolve this issue, please try the following:

Click the Refresh Information button in the Pending Closed Channel dialog.
Click 'Exit Breez'.
Reopen Breez and keep the app running in the foreground for at least 15 minutes and prevent the device from going into sleep mode.
This process should re-synchronize your channel and broadcast the sweep transaction, which will enable you to redeem your funds. If that doesn't help, please contact our support: contact@breez.technology.




Adding Funds via Submarine Swaps
Submarine swaps allow users to transfer on-chain funds to Lightning without trust or counterparty risk, which is exactly how Breez uses them.

Submarine swaps are designed such that the funds in the address provided can only be spent if a Lightning transaction is executed to the user's node within 288 blocks (about 48 hours). If no Lightning transaction is executed by this deadline, the user can redeem the funds when the time lock expires.

Note for advanced users: The script for a submarine swap can be exported from Breez by long-clicking the QR code of the address.

Why does Breez use Submarine Swaps?
Submarine swaps allow Breez to support on-chain transactions while maintaining a single balance. In other words, all of the users' funds are on their Lightning nodes, so there's no need to maintain a separate BTC wallet within Breez, which greatly simplifies the user experience.

Limitations
Sending more funds than the specified limit (shown in Breez below the address) will trigger a refund since no submarine swap may exceed the recipient's channel capacity.
Sending a small amount to a submarine swap address may trigger a refund because users could theoretically spend the funds even if Breez has already executed a Lightning transaction. The reason is that Breez cannot always ensure the on-chain transaction is confirmed before the time lock expires.
Each transaction must be completed with a new, single-use address. Sending multiple transactions to the same address will trigger a refund.
How can users claim their refunds?
If users are unable to claim their funds via Lightning within 288 blocks, a Get Refund option will appear in the Breez side-menu after the deadline (about 48 hours after the on-chain transaction has been confirmed). Click on it and enter an on-chain BTC address when prompted. The funds will be sent to the address entered.



How to close channels in Breez?
In order to close payment channels in Breez, click through Preferences > Developers > Channels > closeallchannels. Funds that were contained in those channels will be available in the Breez app once the closing transactions are confirmed on-chain.

Warning: funds will only be available for redemption if the balance exceeds the on-chain transaction cost.




What fees are there in Breez?
Sending Lightning Payments
Routing fees depend on the available path and for some channels are higher depending on the distribution of liquidity throughout the network. Users can limit fees either as a flat maximum or as a percentage of the transaction amount by clicking Preferences > Lightning Fees and entering the values desired.

Please note, however, that limiting fees may cause payments to fail.

Receiving Lightning payments
Receiving a Lightning payment in Breez incurs no fees for the receiver, unless a new channel is required.

Channel creation
When a new channel is required to accommodate an incoming payment, Breez charges 0.4% of the amount received, with a dynamic minimum fee (based on the current mempool fees). For more information, see the Channel creation on the fly section of this blog post.

The Breez SDK fees are different. Please use the LSP information API to retrieve the fees structure for your specific LSP.

Currently, Breez adds 50k sats of inbound liquidity to the amount received in an incoming payment. For example, if you receive 50k sats, and a new channel is required, Breez will create a new channel on the fly with a capacity of 100k sats.

Please note that the app displays a notification when a new channel is required and a setup fee will be incurred. For Lightning transactions, the notification will appear in the Receive via Invoice screen and again under the invoice QR code. For on-chain transactions, it will apppear under the address QR code in the Receive via BTC Address screen.

There are no additional fees to continue using the channels created.

Receiving from a BTC Address
Receiving from BTC address involves a trustless submarine swap. Check the limits below the QR code before sending funds.

No additional fees are incurred unless a new channel is required.

Send to a BTC Address
Sending to a BTC address involves a trustless reverse swap. Reverse swaps require a minimum transaction amount of 50k sats. Please note that in a high fees environment, the minimum amount may be higher.

Further, Boltz, the reverse swap provider, charges a fixed service fee of 0.5% plus an additional mining fee, which is based on the current bitcoin mempool usage.

Streaming sats to podcasts
Breez charges no more than 5% of the sats listeners stream to creators.



Using the sendcoins command
Please note that the functionality described here is best left to advanced users.

In some cases, like channel closures, users' funds might be deposited automatically into Breez's built-in (on-chain) Bitcoin wallet. If this occurs, we strongly recommend sending the funds to a secure BTC address as soon as possible. Breez offers an Unexpected Funds screen to facilitate this process.

However, the funds may not suffice to initiate a transaction and cover the fees incurred. To send the funds with a minimal fee, enter the following command in the Preferences > Developers screen:

sendcoins --sweepall=1 --addr=dest-btc-address --sat_per_byte=10



Bitcoin Node Synchronization
By default, Breez uses the following node to connect to the Bitcoin network:

bb1.breez.technology

However, any Bitcoin node that supports block filters (BIP 157) can be used. This site lists alternative nodes.

My sync is stuck at 0%, what can I do?
If your node isn't syncing to the network, try the following steps:

Reset the Bitcoin node by clicking Preferences > Network > Reset.
Disconnect any VPN or other intermediary software that might be interfering with network traffic.
Try recovering the chain information. Click on three dots at the top right of the Preferences > Developers menu, then on Recover Chain Information. Then re-open Breez, keep it in the foreground till the sync is finished (might take a long time).
Try syncing with a different node listed here and entering it in the Preferences > Network screen. Choose a regular IP address, not a Tor (.onion) address.



Connecting to a Bitcoin Node
Breez can be connected to any Bitcoin node that supports BIP 157. Bitcoin Core has supported BIP 157 since v0.21. Note: for Tor nodes, you first need to enable Tor in Preferences > Network (Android only for now).

The following configuration flags needs to be added to bitcoin.conf:

blockfilterindex=1
peerblockfilters=1




Breez for Merchants
How to Get Started with Breez POS?
What is Breez POS?
Breez is a full-service, non-custodial Lightning app. Let’s break that down:

Lightning is a bitcoin payment network that reduces transaction times from minutes to milliseconds and transaction fees from several dollars to a few cents or less. Lightning turns bitcoin from digital gold into digital currency while preserving all of the benefits that make bitcoin great.
Non-custodial means that Breez doesn’t take possession of users’ money. Many Lightning apps do take possession of their users’ money. They’re basically bitcoin banks. With a non-custodial app like Breez, all users are their own banks.
Full-service means that Breez takes care of almost all the technical operations automatically and in the background. Things like channel creation, inbound liquidity, and routing stay under the hood. (But Breez is also open source, so those interested in auditing the technology are welcome to do so!)
Breez POS is short for our point-of-sale mode. In other words, Breez works like a digital cash register for businesses and merchants who want to accept Lightning payments (in addition to its “standard” mode, which is like the digital version of a leather wallet for bitcoin, and a next-generation podcast player). Now let’s look at how to set Breez up as a Lightning cash register for your business.

How to get started with Breez?
The first step is to download the app. It’s available for Android and iOS (install TestFlight and click the link from your device).

Breez can back itself up automatically to Google Drive, iCloud or any WebDav server.

Note that each device runs its own Lightning node. You can run POS mode on as many devices as you’d like, but the balances will remain separate.

With the app open, click on the icon at the top left to find the Point of Sale mode.

Setting up POS
Click that icon at the top left, and click Point of Sale > POS Settings.

The Manager Password
In the POS Settings, you have the option to create a manager password. The manager password makes it impossible to send outgoing payments from the Breez app without authorization. Sales staff will only be able to receive payments from the device. Note that if you're using this option, you might also want to prevent access to Breez's backup, so using an external WebDav account (e.g. Nextcloud) is recommended for this use case.

The Items List
The items list is a catalog of items for sale and their prices. There are two ways to add items to the list:

To enter items one at a time, click on Items near the top of the main POS view, then on the “+” sign at the bottom right. Here you can enter the name of a single type of item, the price (displayed in the currency equivalent of your choice), and the SKU (a unique internal identifier for that type of item; it’s optional).
To enter many items at once, click on the calculator icon at the top left, then Point of Sale > Preferences > POS Settings, and then click on the three dots to the right of Items List, and then on Import from CSV. This will allow you to import a CSV file that you prepared in advance containing your items’ names, prices, and SKUs.
Fiat Display
Breez only sends and receives bitcoin, and for most transactions on Lightning, which tend to be for smaller amounts, the sum is usually displayed in Satoshis, a.k.a. sats (1 BTC = 100,000,000 sats). However, many merchants find it practical to be able to see (and tell customers) the value of the purchase displayed in the local fiat currency.

In the main POS view, the currency currently being displayed is visible on the right side (default is SAT). There is also a drop-down list of other currencies available to display. To add or remove currencies from this drop-down list, click on Point of Sale > Preferences > Fiat Currencies. Then simply check the currencies you would like to have in your drop-down menu and uncheck those you would like to omit.

The values displayed are from yadio, a respected outlet for exchange-rate data, and they’re updated in near real time. But remember: whatever currency value is currently being displayed, the payment itself is in bitcoin.

Charging an Order
To compose the order, either add items from the item list or simply enter a sum in the keypad. Then click on Charge at the top of the main POS view. You will then see a QR code that the customer can scan with their Lightning app, that you can share directly from another app on your device, or that you can copy and paste where necessary.

On scanning that code or clicking on the shared/pasted invoice, the customer will see the invoice in their Lightning app and have the option to pay it and settle the transaction immediately.

Once you see the Payment approved! animation in the Breez app on the merchant’s device, you can click on the printer icon to generate a receipt for the customer. To use a receipt printer in Android, try using this driver. Note that you can also print past transactions via the Transactions screen.

Sales Report
To view a daily/weekly/monthly report of your sales (for accounting purposes or others), click on the icon in the top left, and then click on Transactions. Click on the Report icon to display the report and the Calendar icon to change the selected date range.

Exporting Transactions
To view a list of the payments received in Breez, click on the icon in the top left, and then click on Transactions. Click on the three dots on the top right, then on Export to export a list of incoming payments in CSV format. To restrict the list to a certain period of time, click on the calendar icon to set a date range.

Printing Receipts
To print a sale receipt, click on the print icon on the top right of the payment confirmation dialog. Alternatively, click on the icon in the top left, and then click on Transactions. Locate the sale to print, open it and click the top right print icon.

Note: use this driver to print on a portable 58mm/80mm Bluetooth/USB thermal printer.

I want to learn more
For more information on Lightning and Breez, check out our blog.
For more technical tips on how to get the most out of the app and perform common operations, check out our documentation.
If you get stuck and can’t find the answer in any of our help literature, you can find us on Telegram or send us an email.
If you want to see some demonstration videos of the Breez POS mode in action made by our fans and users, here is a great short one, and here is a longer, more detailed one.