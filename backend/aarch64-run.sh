#!/bin/sh

exec ./aarch64/critica-service \
  --port=8080 \
  --database-url=postgres://ubuntu:toor@localhost/critica \
  --site-external-url=https://critica.eaucla.org \
  --auth-service-url=http://localhost:8079
