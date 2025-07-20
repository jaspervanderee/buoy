# Key Features Hierarchy

This file outlines the key fields for services in each category. All categories share these core fields:
1. "name"
2. "type_of_platform"
3. "description"
4. "founded_in"
5. "website"
6. "profile" (founder name(s))
7. "user_experience" (default: "0.0")
8. "countries" (array of country codes, e.g., ["WW", "US"])

## 1. Buy Bitcoin
Category-specific fields (e.g., for exchanges/P2P platforms):
1. "features" (object with "WW" or region-specific arrays of positive/negative text items)
2. "fees" (object with "intro" and optional "tiers" array)
3. "dca" (text description of dollar-cost averaging support)
4. "payment_methods" (array of strings, e.g., ["Bank Transfer"])
5. "custody_control" (e.g., "Custodial" or "Non-custodial")
6. "kyc_required" (e.g., "Yes" or "No")
7. "open_source" (e.g., "Yes" or "No")
8. "interface" (e.g., "Mobile only")
9. "app_ratings" (object with "ios" and "android" numbers)

## 2. Spend Bitcoin
Category-specific fields (e.g., for hot wallets):
1. "supported_network" (e.g., "Bitcoin + Lightning")
2. "features" (object with "WW" or region-specific arrays of positive/negative text items)
3. "custody_control" (e.g., "Non-custodial")
4. "kyc_required" (e.g., "No")
5. "open_source" (e.g., "Yes")
6. "recovery_method" (e.g., "Seed phrase")
7. "interface" (e.g., "Mobile only")
8. "app_ratings" (object with "ios" and "android" numbers)

## 3. Store it safely
Category-specific fields (e.g., for wallets/custody solutions):
1. "supported_network" (e.g., "Bitcoin")
2. "features" (object with "WW" or region-specific arrays of positive/negative text items)
3. "price" (e.g., "Free" or "$149 for device")
4. "custody_control" (e.g., "Collaborative custody")
5. "kyc_required" (e.g., "No")
6. "recovery_method" (e.g., "Seed phrase")
7. "open_source" (e.g., "Yes")
8. "node_connect" (e.g., "Yes")
9. "interface" (e.g., "Desktop only")
10. "app_ratings" (object with "ios" and "android" numbers; use {"text": "No app available"} if none)

## 4. Run my own node
Category-specific fields (e.g., for node software/hardware):
1. "features" (object with "WW" or region-specific arrays of positive/negative text items)
2. "price" (e.g., "$299 for hardware device")
3. "interface" (e.g., "Desktop only")
4. "support" (e.g., "Community forums")

## 5. Accept Bitcoin as a merchant
Category-specific fields (e.g., for payment processors/gateways):
1. "supported_network" (e.g., "Bitcoin + Lightning")
2. "features" (object with "WW" or region-specific arrays of positive/negative text items)
3. "fees" (object with "intro", "subscription_fees", "conversion_fees", "settlement_time")
4. "compatibility" (e.g., list of e-commerce platforms)
5. "pos_compatibility" (e.g., "Yes")
6. "custody_control" (e.g., "Custodial")
7. "kyc_required" (e.g., "Yes")
8. "open_source" (e.g., "Yes")
