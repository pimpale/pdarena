#!/bin/sh

exec ./aarch64/pdarena-service \
  --port=8080 \
  --database-url=postgres://postgres:toor@localhost/pdarena \
  --judge0-service-url=http://localhost:2358 \
  --site-external-url=http://localhost:3000 \
