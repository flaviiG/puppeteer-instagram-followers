#!/bin/bash

xvfb-run --server-args="-screen 0 1024x768x24" node index.js "$@"