FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html style.css app.js blend.js thermo.js sw.js manifest.json /usr/share/nginx/html/
COPY icons /usr/share/nginx/html/icons

# Version scripts and styles with a hash of the content, so a CDN or browser cache
# can never mix an old app.js with a new index.html after a deploy. The icons count
# too: a new icon then means a new service worker that stores it again.
RUN cd /usr/share/nginx/html \
 && v=$(cat index.html style.css app.js blend.js thermo.js sw.js manifest.json icons/* | md5sum | cut -c1-10) \
 && sed -i -E "s#(src|href)=\"(style\.css|blend\.js|thermo\.js|app\.js)\"#\1=\"\2?v=$v\"#g" index.html \
 && sed -i "s#const VERSION = 'dev';#const VERSION = '$v';#" sw.js \
 && sed -i "s#__ASSET_VERSION__#$v#" /etc/nginx/conf.d/default.conf \
 && test $(grep -o "?v=$v" index.html | wc -l) -eq 4 \
 && grep -q "const VERSION = '$v';" sw.js \
 && grep -q "\"$v\"" /etc/nginx/conf.d/default.conf \
 && nginx -t

EXPOSE 80
