# Slouch

A lazy, pull-only, continuous replication server from CouchDB to MongoDB.

## Why?

Because I'm a lazy programmer.

Because I wanted the ability to write a geospatial-aware API server with a
roles-based ACL, but I didn't want to write either of those features themselves.
CouchDB has a sufficient ACL implementation, but it doesn't support geospatial
queries. MongoDB supports geospatial queries, but it's ACL implementation is
practically non-existent. Since MongoDB is a master-slave setup anyway, the only
conceptual change here is that the writable master is CouchDB.
