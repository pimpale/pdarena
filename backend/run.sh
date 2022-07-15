#!/bin/bash

./target/debug/pdarena-service \
  --port=8080 \
  --database-url=postgres://postgres:toor@localhost/pdarena \
  --auth-service-url=http://localhost:8079 \
  --pythonbox-service-url=http://localhost:8075 \
  --site-external-url=http://localhost:3000 \
