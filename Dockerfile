FROM nginx:stable-alpine

COPY index.html style.css app.js blend.js thermo.js /usr/share/nginx/html/

EXPOSE 80
