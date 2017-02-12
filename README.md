# Docker of Life

This repository contains
[Conway's Game of Life](https://en.wikipedia.org/wiki/Conway's_Game_of_Life)
game created using [Docker](https://www.docker.com/) containers.

The game prints the generation to the console, where `X` is alive and `O` is dead.

## Setup

### Requirements

- NodeJS and npm
- Docker
- Docker Compose

### How to set up

- Install dependencies with `npm install`
- Build Docker of Life cell image with `npm build`
- Run Docker of Life with `npm start`

## Changing the initial state

To change the initial state, modify `gamegrid.txt`, where `0` means an initially
dead cell and `1` a live cell.
