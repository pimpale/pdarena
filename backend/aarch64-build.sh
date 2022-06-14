#!/bin/sh
mkdir aarch64
cross build --release --target aarch64-unknown-linux-gnu && cp ./target/aarch64-unknown-linux-gnu/release/critica-service ./aarch64/critica-service
