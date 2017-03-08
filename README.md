# Docker of Life

This repository contains
[Conway's Game of Life](https://en.wikipedia.org/wiki/Conway's_Game_of_Life)
game created using [Docker](https://www.docker.com/) containers.

The game prints the generation to the console, where `X` is alive and `.` is dead.

## Setup

### Requirements

- NodeJS and npm
- Docker

### How to set up

- Install dependencies with `npm install`
- Build Docker of Life cell image with `npm run build`
- Run Docker of Life with `npm start`
  - Number of generations run can be specified with arguments e.g. `npm start 5`
  - Default number of generations run is 3

## Changing the initial state

To change the initial state, provide another initial state file using flag `-f`,
 e.g. `npm start -- -f ./beacon.txt`. You can also provide your own base state
 with own file, where `0` means an initially dead cell and `1` a live cell.

## Preserving Docker containers

Docker containers are by default deleted after the run to prevent excess amounts
 of containers. To preserve the containers used in a generation, use `-d false`
 flag like `npm start -- -d false`. Containers can be deleted manually using
 `npm run purge`.
