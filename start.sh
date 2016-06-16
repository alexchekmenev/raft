#!/usr/bin/env bash
forever stopall
CLUSTER=cluster1 ROLE=router PORT=9000 forever start -o ./logs/router.out.txt bin/www
CLUSTER=cluster1 NAME=srv1 ROLE=node PORT=9001 forever start -o ./logs/srv1.out.txt bin/www
CLUSTER=cluster1 NAME=srv2 ROLE=node PORT=9002 forever start -o ./logs/srv2.out.txt bin/www
CLUSTER=cluster1 NAME=srv3 ROLE=node PORT=9003 forever start -o ./logs/srv3.out.txt bin/www
forever list