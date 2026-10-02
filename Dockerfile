FROM nginx:stable-alpine

COPY index.html style.css app.js blend.js thermo.js sw.js manifest.json /usr/share/nginx/html/
COPY icons /usr/share/nginx/html/icons

EXPOSE 80
