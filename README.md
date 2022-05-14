`🌐 Light-weight http server`

This is a small HTTP server library written with 💖 and TypeScript and is meant to be simple and lightweight.

---
> ⚠️ The library is still in development and may change a lot.
---

## Server

```ts
import { Server } from 'https://deno.land/x/http/mod.ts';

const server = new Server();

server.on('/', 'GET')(({ respond }) => {
  respond({ body: 'Hello World!' });
});

server.listen(8080);
```

## Middleware

```ts
import { Server } from 'https://deno.land/x/http/mod.ts';

const server = new Server();

server.use('/*', 'GET')(() => {
  console.log('A new GET request');
});

server.on('/*')(({ respond }) => {
  respond({ body: 'Hello World!' });
});

server.listen(8080);
```

## Routers

```ts
import { Server } from 'https://deno.land/x/http/mod.ts';

const server = new Server();
const users = new Server.Router('/users');

users.on('/:id', 'GET')(({ params, respond }) => {
  respond({ body: localStorage.getItem(params.id) });
});

users.on('/', 'POST')(async ({ body, respond }) => {
  const user = await body.json();

  localStorage.setItem([user.id], user);
  respond({ status: 200 });
});

server.use()(users);

server.listen(8080);
```

## Static Files

```ts
import { Server } from 'https://deno.land/x/http/mod.ts';

const server = new Server();

server.static('/files', './assets/');

server.listen(8080);
```

## WebSockets

```ts
import { Server } from 'https://deno.land/x/http/mod.ts';

const server = new Server();

server.on('/ws', 'GET')(async ({ upgrade }) => {
  const socket = upgrade();

  if (!socket) return;

  socket.addEventListener('open', () => socket.send('Hello, Socket!'));
});
```
