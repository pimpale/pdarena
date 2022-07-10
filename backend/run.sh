#!/bin/bash

./target/debug/pdarena-service \
  --port=8080 \
  --database-url=postgres://postgres:toor@localhost/pdarena \
  --auth-service-url=http://localhost:8079
  --judge0-service-url=http://localhost:2358 \
  --site-external-url=http://localhost:3000 \
