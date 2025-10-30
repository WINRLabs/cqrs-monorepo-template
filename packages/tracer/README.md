# Tracer

This package is used to create a tracer for the application. It is used to trace the application.

## Usage

```ts
import { createOtelSDK } from '@justbet/tracer';

const sdk = createOtelSDK('winr-queuemaker', process.env.NODE_ENV === 'production');

sdk.start();
```
