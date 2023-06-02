🌐 **Small http server library**

> ⚠️ It should be noted that the library is in the early stages of development and is not ready for use in production. The API may change in the future.

## 📦 Usage
```ts
import { HttpServer } from 'http-server';

const server = new HttpServer();

server.route('/hello')(({ respond }) => {
  respond({ body: 'Hello, World!' });
});

server.route('/posts/:id', 'POST')(async ({ respond, params, body }) => {
  posts[params.id] = await body.text();
});

server.route('/*')(({ respond }) => {
  respond({ status: 404, body: 'Not Found' });
});

server.listen(8080);
```

## 📖 Integration with [utility functions](https://github.com/agorushkin/http-server-utils)
```ts
import { serve, file } from 'http-server-utils';

server.use(serve('/static', './static/'));

server.use('/')(({ respond }) => {
  respond({ body: file('./index.html') });
});
```