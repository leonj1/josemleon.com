# josemleon.com

Personal website / portfolio for Jose Leon. Single-page app (home, about, blog, contact, resume). Static — no backend, no build step.

**Stack:** AngularJS 1.x (`ui-router`, `ui-bootstrap`), Bootstrap 3, RequireJS, jQuery.

## Run it

Needs an HTTP server — RequireJS loads templates via `XHR`, so `file://` won't work.

```bash
git clone https://github.com/leonj1/josemleon.com
cd josemleon.com
python3 -m http.server 8000
```

Open http://localhost:8000

Standalone resume also lives at http://localhost:8000/resume/ (plus PDF in `resume/`).

## Layout

| Path         | What                                             |
|--------------|--------------------------------------------------|
| `index.html` | SPA shell, loads Angular + libs                  |
| `js/app.js`  | Routes / `ui-router` states                      |
| `views/`     | Page templates (home, about, blog, contact, ...) |
| `css/`       | Custom styles                                    |
| `lib/`       | Vendored deps (angular, bootstrap, jquery, ...)  |
| `resume/`    | Standalone resume page + PDF                      |
