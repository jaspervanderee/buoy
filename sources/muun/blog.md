Why is Muun's fee estimator more efficient?

Muun's estimator allows you to pay more efficient fees for your next-block transactions. What do more efficient fees mean? Not overpaying when it isn’t needed, nor underestimating the fee rate when the network congestion is high.

Fee estimation is hard. Bitcoin's block arrival times follow a Poisson distribution and there is an open market of users competing for block space. Handling the complexity of the fee market is the responsibility of your wallet, not yours.

That was our motivation to built and trained Muun's estimator from scratch. In this post, you can learn how, why, and when you save money using Muun. For real-time savings, visit our website.

What’s different about Muun's estimator
If you aren't using Muun yet, chances are your wallet is getting fee estimations from bitcoind. The main difference with bitcoind, and most fee estimators, is that Muun's is mempool-based: it looks at the current state of the mempool to suggest a next-block fee rate. Other estimators suggest fee rates based on past blocks, transactions, and fee rates.

In all honesty, Muun's estimator does what power users have been doing since the very beginning: checking the state of the mempool to decide the fee for transactions. If this is your case, you can think of the estimator as a super-power version of yourself, trained with lots of data 🦸🏻!

There are cases when both kinds of estimators throw similar suggestions. This happens when the mempool size is relatively constant (fun fact: bitcoind itself was built in a time when the mempool was much more constant than nowadays!). In this scenario, estimators suggest similar next-block-fees and have similar precision^[1].

When the mempool size varies estimators vary a lot as well. Variations in the mempool size happen frequently and may have different causes. Perhaps the simplest one is that a block can take way more or way less than 10 minutes to be mined.

When a block isn’t mined for a long period of time, the mempool gets packed with transactions. If your wallet fails to consider this, it will underestimate the next-block-fee. You will set a fee expecting your transaction to be confirmed in the next block, but it won’t. Spam attacks can lead to the same scenario.

Similarly, if two or more blocks get mined in a shorter period of time, the mempool may lower its size considerably. If your wallet doesn’t take this into account, you will probably end up overpaying fees.

Something similar happens during weekends. Usually, the optimal next-block-fee lowers significantly during weekends due to fewer bitcoin transactions. Most estimators are agnostic to this and they suggest unnecessary high fees. Want to check it yourself? Come visit us during the next weekend!

Benchmarks
In order to benchmark our estimator, we took data from the last year and chose some of the most popular estimators in the industry, including bitcoind and Earn, another mempool-based estimator.

For each estimator, we set the parameters of our estimator to match its precision (higher precision means more chances of confirmation, but more expensive) and calculated the differences of the estimated fees.

Bitcoind conservative (precision 82.26%): Muun's fee estimator is 29.89% cheaper, on average, for the same precision.
Bitcoind economical (precision 71.89%): Muun's fee estimator is 12.86% cheaper, on average, for the same precision.
Earn (precision 87.83%): Muun's fee estimator is 23.75% cheaper, on average, for the same precision.



Self-Custody in Muun: Why Not just a Mnemonic?

Muun uses advanced bitcoin scripts for its security model (with multisig) and to enable instant and cheap transactions (with lightning).

Mnemonics are a great backup mechanism to store private keys but lack other information required for spending multisig and lightning funds independently. Having just a mnemonic would mean your bitcoin could be easily frozen.

Self-custodianship is at the core of everything we do. Therefore, we built an Emergency Kit, leveraging new standards like output descriptors, to provide you with full custody of your bitcoin.

Self-custody: When was a mnemonic enough?
For the last years[1], you could summarize the security model of most self-custodial wallets as:

Your wallet created a master private key.
From it, bitcoin addresses were derived and used to receive funds.
Your private key had two purposes: to find your unspent outputs and to spend them.
Wallets asked users to make a backup of their key and keep it safe. To provide a nice experience, private keys were represented as a mnemonic - a group of easy-to-write words. By writing 12 words on paper, you could later perform step 3 without relying on any particular app or service.

Mnemonics did a good job. They were a static backup that you created once, and it lasted forever, making sure you had complete control over your money. Importantly, they provided a single, simple instruction to give to newcomers: “write down the 12 words and keep them safe”.

The dirty little secret of mnemonics was that you needed some extra information to find back your unspent outputs. If you didn't remember the wallet you used to create the mnemonic, or it was no longer available, finding the required derivation path, script type, and gap limit usually involved a combination of googling, guessing, and brute-forcing.[2]

What changed: multisig, lightning and taproot.
As bitcoin evolved, new spending conditions began to be explored, unleashing a new world of improvements in security, user experience, and more.

Multi-signature is one such example. In multisig wallets, you can no longer use a single private key to find the unspent outputs or spend its funds. Other data that can't be guessed, such as the public keys from all the participants, is needed.

Lightning Network is an even more sophisticated scenario. Depending on the implementation, a lightning wallet may require you to back up data that changes during your wallet's life[3]. This has a significant implication. It means self-custody is no longer something you get once and forever, but something you can lose if you don't keep your backup updated[4].

Finally, taproot is on the way 💫. Taproot is a privacy and scaling improvement for complex spending conditions like multisig and time-lock vaults. We are very much looking forward to using it once it's ready. Similar to multisig and lightning, taproot also usually needs more information than a mnemonic can provide.

As the bitcoin ecosystem continues to develop, mnemonic recovery will most likely become less interoperable and more obsolete. Fortunately, some of the industry's best minds are currently working on new standards, like miniscript and output descriptors, to solve these new challenges. These standards allow wallets to build more secure and private setups while keeping static backups feasible and interoperable[5].

Muun’s Emergency Kit
Muun is a multisig wallet with lightning support, so backing up a mnemonic alone would mean your bitcoin could be easily frozen. Self-custodianship is at the core of everything we do, so this wasn't acceptable. We built an Emergency Kit that gives you full self-custody of your money when combined with your Recovery Code[6].

Your Emergency Kit is a PDF document with the information and instructions needed to find and spend your funds independently. No need to brute-force any missing data. Everything is there, including your private keys and output descriptors[7].

Your private keys are securely encrypted with your Recovery Code. This makes your Emergency Kit harmless by itself: you can keep multiple copies, and you can even store it safely on the cloud.

By combining your Emergency Kit and Recovery Code, you have total, undisputed control over your bitcoin.

Conclusion
Wallet recovery can get tricky in the brave new world of bitcoin smart-contracts. As more wallets adopted mnemonics, it became easy to think they are universal, interoperable, and enough for self-custody. But we are heading in the opposite direction.

We believe that output descriptors, miniscript, and 2-layered backup systems are the way to go for modern wallets. There's still a lot of standardization and tooling work to be done, but we are getting closer by the day!

Stay safe and remember: “Not your keys, not your coins” does NOT imply “Your keys, your coins”.

This became the go-to model for wallets after the introduction of BIP32 (HD wallets), BIP39 (mnemonics) and BIP44 (standard derivation paths) from 2012 to 2014. ↩︎

Recent documentation efforts like https://walletsrecovery.org/ made this process much more enjoyable than it used to be. ↩︎

To exit a payment channel without collaboration, you may need an off-chain pre-signed transaction. ↩︎

Because of the need for dynamic backups, encrypted cloud storage plays an important role in lightning wallets. ↩︎

Notice that for some off-chain protocols, static backups might not be enough. ↩︎

Your Recovery Code is a set of randomly-generated characters that Muun prompts you to write on paper. It has more entropy than a 12-words-mnemonic. ↩︎

The output descriptor standardization is still a work in progress, so some notation might change in the near future. ↩︎




Muun's Multi-Signature Model

TL;DR:
Muun is a 2-of-2 multi-signature wallet, so all your outgoing transactions need to be signed with 2 keys instead of 1. This setup enables what we call warm storage: good security is balanced with good UX, and self-custody is never compromised.

Instead of holding all keys hot in one single device (your phone), you only carry one key there. Muun co-signs daily transactions. Full self-custody is achieved by holding both keys cold in your Emergency Kit.

The most common segmentation for self-custodial wallets is hot versus cold wallets. In hot wallets, keys are stored in devices connected to the Internet, such as phones and computers. This is the case for mobile and desktop wallets. On the other hand, in cold storage, keys are stored in a place that has a very limited connection, or no connection at all, to the Internet. Hardware and paper wallets are the most common in this segment.

You have probably heard about the pros and cons of each kind of storage. Hot wallets usually win on the usability front because they work on online devices that we use daily. Cold wallets typically win on the security field. Having your keys in a device connected to the Internet means they are more exposed to hacks. Therefore, having your keys with limited or no connection to the Internet is a good choice when maximizing security.

Since its creation, bitcoin tech has evolved a lot. In particular, new spending conditions emerged, making the hot-versus-cold segmentation overly simplistic. While during the first years, the only requirement for spending bitcoin was to own the key that would sign valid transactions, the introduction of multi-signature has brought more exciting and complex spending conditions that enable new models with better security and usability. These models can have some keys in hot storage and some others in cold storage, bringing together each kind's benefits.

Let's look at how Muun enhances security while preserving self-custodianship by using a 2-of-2 multi-signature model for all your outgoing transactions.

The goal
From a security standpoint, a bitcoin wallet should meet the following rules:

Rule 1: You should be able to spend your bitcoin without anyone's permission. This translates to you having enough keys to spend funds independently.
Rule 2: The wallet provider should never be able to spend your bitcoin. This translates to the wallet provider never having enough keys to spend your funds.
Rule 3: Attackers should find it extremely hard to steal funds. This translates to attackers finding it hard to obtain enough keys to steal funds.
Let's explore them in detail.

The way
Rule 1: You should have enough keys to spend funds independently.
This is one of bitcoin's most significant advantages and the basic requirement for a wallet to be considered self-custodial. If you use a wallet that fails to fulfill this rule, your funds could be frozen.

To meet Rule 1, you can export your Emergency Kit with all the information and instructions you need to independently spend your funds, including your private keys and output descriptors. If you wonder why Rule 1 isn't met by providing just a mnemonic, you can read more about where bitcoin's recovery is heading in this blog post.

Rule 2: The wallet provider should never have enough keys to spend funds.
If Rule 1 is about making your funds impossible to freeze, Rule 2 is about making them impossible to seize. Any self-custodial wallet should think about both non-freezability and non-seizability.

When it comes to non-seizability, 'won't become evil' is always a weaker statement than 'can't be evil'. Even if the wallet provider doesn't become evil deliberately, someone could force it to act in an evil way. For example, governments and powerful institutions could force bitcoin companies to confiscate funds.

To avoid this from happening, Muun's makes sure to never have the power of confiscating funds. Your funds can only be spent by two keys, which Muun simply doesn't hold.

Rule 3: Attackers should find it hard to obtain enough keys to steal funds.
Security measures are always about maximizing the things that must go wrong before an attacker finds its way to you. Each added measure reduces the number of people that have the means to attack you and discourages the most sophisticated attackers by making the ordeal cost more than it's worth.

This concept is widely known in information security and usually referred to as defense in depth. Its intent is to provide redundancy in the event a security control fails, or a vulnerability is exploited. To meet this rule, Muun ensures your decrypted private keys are never stored in the same place:

Your phone stores only the first key. If it gets hacked and attackers can extract your secure storage contents, they won't find enough keys to steal your funds. This is not a theoretical threat. It has happened multiple times, with people losing a considerable amount of bitcoin in a matter of seconds. Downloading a malicious app or opening a dangerous file may be enough to get your phone compromised.
Muun's servers store only the second key. So neither Muun nor its potential attackers will find enough keys to steal your funds.
Your Emergency Kit has both keys, but they are encrypted. For full self-custody, you need to have both keys, but this doesn't imply your need to carry both of them on your phone. Both keys are encrypted in your Emergency Kit with a code written on paper, with no connection to the Internet. Neither the Emergency Kit, nor the Recovery Code are enough on their own to move funds.
Spending funds
So far, we have seen how a 2-of-2 multi-signature model fulfills the most important security goals of a self-custodial wallet by combining hot and cold storage. Now, what happens when you simply want to make a payment? How is the model more convenient than keeping your keys in cold storage?

From a usability standpoint, you should be able to spend funds easily. After all, a key aspect of any wallet is that you can move bitcoin freely whenever you want.

You could, of course, spend funds by decrypting your Emergency Kit with a cold Recovery Code. However, spending funds with the Emergency Kit is intentionally inconvenient since it was designed by heavily prioritizing security vs. usability, making no concessions. For that reason, the Kit  should only be necessary for an emergency.

Instead, you and Muun will cooperate for daily transactions by each party providing the key they hold on hot storage. Cooperating makes your spending easy while stealing hard.

Conclusion
While the trade-offs between cold and hot storage are widely discussed, you can have the best of both worlds with careful design. Multisig tech obsoletes the cold versus hot storage, making it more of a gradient. Good security is balanced with good UX, and self-custody is never compromised.


A Closer Look at Submarine Swaps in the Lightning Network

Submarine swaps have been in the talk for a couple of weeks and there are already some interesting implementations in products and services . But, what exactly are they and how do they work? In this post we answer these questions.

To understand submarine swaps, we first need to talk about HTLCs: hashed time-locked contracts. They are easier to understand than what it seems. And, the good thing is that understanding HTLCs is not just key to understanding submarine swaps but also the Lightning Network itself.

HTLC as building blocks
Let’s say you are a proud owner of a bitcoin and you send it to an address that belongs to your friend, Martin. To spend the bitcoin, Martin needs to prove he has the corresponding private key to that address. This is how Bitcoin works at the basic level: Martin proves he has the key and he can spend the money.

I’ve said “at the basic level” because you could add more conditions for Martin to spend that bitcoin. In particular, you could add the condition that Martin has to reveal a certain secret within a given period of time, called a timeout. When the time expires, the bitcoin can be spent by another set of keys, for instance, some you own.

Where does this secret come from? The secret is a piece of information Martin, or someone else in the network, created. If Martin created the secret himself he will, of course, know it at the moment of payment. If someone else created it, Martin needs to find out what the secret is.

In any case, it makes sense that, as soon as Martin gets to know the secret, he will spend the bitcoin, even if that means sending to another address he owns, to prevent the timeout from getting activated. We’ll call this action to claim funds.

So, this is an HTLC in a nutshell: it is a contract that requires the receiver in a transaction to prove they know a particular secret, within a certain period of time, in order to spend the money.

It turns out that adding this condition enables a very interesting and useful feature: the ability to chain payments. This might not be initially relevant for on-chain transactions, where you could pay directly to the final recipient at any time, but it is very useful in the Lightning Network, where being able to pay directly to everyone would be very inefficient.

Because it is easier to understand the purpose of HTLCs within the context of a routed network, such as the Lightning Network, we’ll see an example of an off-chain payment first. Keep in mind, however, that HTLCs work in both on-chain and off-chain transactions. They even work in other blockchains, like Litecoin’s.

HTLCs in the Lightning Network
Imagine you want to pay 1 BTC to Sandra but you don’t share a payment channel with her. Instead, Thomas, who has channels with both of you, will route the payment. What could go wrong in this chain of payments?

Without HTLCs, and depending on who pays first, two things could go wrong:


If you pay Thomas first, trusting he would then pay Sandra, Thomas could run away with your funds.

If Thomas pays Sandra first, trusting you will then pay him, you could make Thomas pay your expenses for you and never give the money back.
Using an HTLC, Sandra can create a secret that only she knows and tell you to safely send the bitcoin to Thomas, adding a clause that in order to spend the bitcoin he needs to reveal the secret within a period of time. If he doesn’t, you’ll be able to spend the bitcoin. Sandra will give you this instruction in the QR code with the Lightning invoice she shows you. She can do this without revealing you the secret itself, because of an interesting property: you will know Thomas is revealing the secret she created, even without knowing the secret beforehand.

Now Thomas can send Sandra a bitcoin, and include the same clause: to spend it she needs to reveal the secret within a period of time. Sandra, who already knows the secret, can claim the money right away. At the moment of claiming the funds, Sandra reveals the secret, Thomas gets to know it and he can claim the bitcoin you send him.


The result is you successfully paid Sandra through Thomas, without trusting each other and nobody risking their funds. Now you and Thomas know the secret Sandra created, and you can both use it as a proof of payment, since Sandra revealed it to claim the money she was being paid. Notice that the time-outs are important for having a way to “rollback” payments in case Sandra refuses or is unable to reveal the secret.

HTLCs in Submarine Swaps
HTLCs can be included in both, on-chain and off-chain, transactions. In fact, they can be used to chain payments that happen between an on-chain sender and an off-chain receiver, and vice versa. These are submarine swaps.

Let’s suppose you want to pay something in the Lightning Network but don’t want to manually manage channels yourself. Submarine swaps allow you to use your on-chain bitcoins to pay the lightning invoice, through a swap provider. How would this work?

The Lightning merchant generates a QR code hinting you the secret you should ask the swap provider to reveal in order to claim the money you will send them. You can now safely send the swap provider your bitcoin, making an on-chain HTLC.

The swap provider cannot spend the bitcoin you just sent to him because he doesn’t know the secret yet. Instead, he will transfer a bitcoin to the Lightning merchant, via Lightning, adding the clause that to claim the fund, the merchant has to reveal the secret.

The Lightning merchant already knows the secret, but to claim the money he has to reveal it. In that process, the swap provider gets to know it, and claims the money you sent them. Both, the swap provider and the merchant, claim the money received, but there’s a difference: while the swap provider claims the money on-chain, the merchants does it off-chain.


What are Submarine Swaps useful for?
Submarine swaps might be the easiest way for someone to make their first payment via Lightning. While you still incur on-chain fees, the payment flow is similar to one on-chain and payments can be instant (depending on the implementation). Also, if you are just looking to try the Lightning Network, opening a channel itself also requires an on-chain transaction. Since we are in the early days of Lightning, having an easy on-ramp for people to try it is important. This is the reason why we implemented submarine swaps in Muun Wallet.

Submarine swaps can also be useful for cases where users need to move part of their money on-chain to off-chain, and the other way around. For instance, after a successful week of sales via Lightning, a merchant might need to get on-chain bitcoins to pay providers. Loop Out provides a way of doing a reverse submarine swap, and at the same time rebalance channels to get inbound capacity.

Finally, and given that submarine swaps can also be done with other coins, you could use for instance Litecoin, which has lower fees and faster confirmation times, to make a Lightning payment to a merchant or provide more liquidity to your channels.

Submarine swaps started as an idea by Alex Bosworth and Olaoluwa Osuntokun from Lightning Labs and have gained more popularity with time. Although not without its downsides, it has some interesting applications that can help the network in its early days in two big fronts: liquidity and adoption.




Muun's New Open Source Model

We're happy to share that Muun is moving to a new open-source model, much more aligned with the values of the bitcoin's community and our mission.

As announced in the Muun 2.0 launch, we are committed to building a bitcoin wallet that makes self-custody easy and safe for everyone in the world. Since the launch, several people from the bitcoin community have reached out to us and shared their concerns about our open-source model. We've come to understand that self-custody cannot truly exist without easy auditability and openness, which motivated us to make this change.

As of today, Muun's native apps can be entirely built from the code published in our public repository, our software is licensed as MIT, and we are working on having reproducible builds.

How we got here
From early on, we knew that auditability was a key component of self-custody, and our code has always been published in a public repository. At the same time, we were (and still are!) worried about this software being used to distribute malicious copies that steal users' funds. Sadly, this is an all-too-real risk for newcomers and clearly goes against our mission.

For this reason, when we released Muun 1.0 we decided to publish the apps' source code without the UI layer. This would make it easy to audit the relevant parts of the codebase, but make it really difficult for scammers to replicate a malicious version of the app.

Many things have changed since then. Reproducible builds are now viable for mobile applications distributed through the official app stores. App store providers have expressed their willingness to work with us to identify and remove scams from their stores. Finally, we now have a larger user base helping us detect and report scams.

All this encouraged us to review our past decision. We believe that having verifiable builds is the only way to provide true self-custody. Muun is now ready to take its auditability to the next level.

Roadmap
Today we are happy to share that both the Android and iOS apps can be entirely built from the source code. We are currently working to have reproducible builds for the Android application, which will be available soon. We are also looking into how to build the iOS application deterministically, which is much harder and, to our knowledge, hasn't been done before. It will take some time, but we are excited about bringing this to iOS as well.

Finally, as we go forward, we'll be moving towards a much more open development process, in order to make auditabilty easy and true self-custodianship a reality. This will take us time, but we'll keep moving in that direction.

Thanks for your support and feedback! We'll keep up the hard work.