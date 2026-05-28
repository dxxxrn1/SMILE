# SMILE Student Chess Feature

This folder repackages the chess game as a SMILE-ready student feature without connecting it to the main project yet.

## What Is Included

- `frontEnd/chess.html` - the chess game page copied from the existing `chess-game` folder.
- `frontEnd/smileChess.css` - SMILE styling overrides using your dashboard colors, cards, gradients, and typography.
- `server/chessRoutes.js` - Express routes for serving the chess page and CSS.
- `server/chessSocketController.js` - reusable Socket.IO multiplayer logic for lobby, challenges, rooms, moves, game chat, and leaderboard API.
- `server/standaloneChessServer.js` - the original standalone chess server copied for reference.

## Important

This feature is not connected to `src/server/main.js` yet.

Your current main project does not include `socket.io` in the root `package.json`. Multiplayer will need Socket.IO installed when you decide to connect this feature.

## Future Integration Steps

1. Install Socket.IO in the main project:

```bash
npm install socket.io
```

2. Copy or import `server/chessRoutes.js` into the main server routes.

3. Change `src/server/main.js` from `app.listen(...)` to an HTTP server, then attach Socket.IO:

```js
import { createServer } from "http";
import { Server } from "socket.io";
import chessRoutes from "./routes/chessRoutes.js";
import { registerChessSockets } from "./controllers/chessSocketController.js";

const httpServer = createServer(app);
const io = new Server(httpServer);

app.use("/", chessRoutes);
registerChessSockets(io);

httpServer.listen(port, () => {
  console.log(`This web is running on http://localhost:${port}`);
});
```

4. Add a student dashboard button later:

```html
<a href="/student/chess" class="btn btn--primary">Play Chess</a>
```

## Notes For Later

- The current game uses browser-side chess logic copied from the original folder.
- The multiplayer server validates turns but does not fully validate chess legality on the server yet.
- For production fairness, server-side move validation should be added before saving official scores.

