# Public website: aclipseawardbec.io.vn

Status: configuration prepared locally; website not deployed and DNS not changed.

## Hosting requirements

- Node.js 24 or newer with `node:sqlite` support.
- A continuously running Node.js process.
- Persistent writable storage for `data/bec-vote.sqlite`.
- HTTPS, with requests forwarded to the application's port.
- Run a single application instance for this SQLite deployment.

The domain is registered at iNET. Hosting/VPS availability must be confirmed before choosing an installation method or DNS target. A domain alone does not run the application. Static hosting cannot run this Node.js/SQLite backend.

## Environment

See `.env.example`. Configure `PUBLIC_ORIGIN=https://aclipseawardbec.io.vn` on the server so HTTPS form requests are accepted and session cookies use `Secure`. Set `HOST`, `PORT`, and `DATA_DIR` according to hosting requirements. If storing the values in `.env`, start with `node --env-file=.env server.mjs`.

Do not place `.env`, the `data` folder, or SQLite backups in a public repository or static document root. Back up the database before transferring existing votes.

## Remaining deployment steps

1. Confirm the iNET hosting/VPS package and Node.js support.
2. Upload code and media, configure persistent storage and process restart.
3. Point domain DNS to the exact IP/hostname provided by that server. Preserve unrelated email and domain verification records.
4. Enable HTTPS and proxy traffic to the application.
5. Verify logo/video/images, Gmail login, voting, duplicate rejection, and persistence after restart on the public domain.

## Login behavior

The current login accepts a self-declared Gmail address without ownership verification, as requested. Public access does not change that limitation. Google Sign-In or email OTP would be a separate change if verified voting is required.
