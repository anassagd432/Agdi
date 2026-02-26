---
title: "Crypto Toolkit"
description: "Hash cracking, identification, encoding/decoding, and password generation."
---

# Crypto & Hash Toolkit

## Hashing

```typescript
import { CryptoToolkit } from "agdi/autonomous";
const crypto = new CryptoToolkit();

// Hash a string
const result = crypto.hash("password123", "sha256");

// Hash with all algorithms at once
const all = crypto.hashAll("password123");
// Returns: MD5, SHA-1, SHA-256, SHA-512, SHA3-256, SHA3-512

// Identify an unknown hash
const types = crypto.identifyHash("5f4dcc3b5aa765d61d8327deb882cf99");
// → ["MD5", "NTLM"]
```

## Cracking

```typescript
// Crack with Hashcat
const result = await crypto.crackWithHashcat(
  "5f4dcc3b5aa765d61d8327deb882cf99",
  0, // MD5 mode
  "/usr/share/wordlists/rockyou.txt",
);

// Crack with John the Ripper
const results = await crypto.crackWithJohn("/tmp/hashes.txt");
```

## Encoding / Decoding

```typescript
crypto.base64Encode("hello"); // → "aGVsbG8="
crypto.base64Decode("aGVsbG8="); // → "hello"
crypto.hexEncode("hello"); // → "68656c6c6f"
crypto.urlEncode("a b&c"); // → "a%20b%26c"
crypto.rot13("Hello"); // → "Uryyb"
```

## Password Generation

```typescript
const passwords = crypto.generatePasswords({
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  count: 10,
});
```
