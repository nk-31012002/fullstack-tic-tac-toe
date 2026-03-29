# Use the official Nakama image
FROM heroiclabs/nakama:3.21.1

WORKDIR /nakama

# Copy your modules (this includes main.js and nakama-config.yml)
COPY ./nakama-modules /nakama/data/modules/

# Standard Nakama ports
EXPOSE 7349 7350 7351 9100

# Chained command: Migrate, then start the server
ENTRYPOINT ["/bin/sh", "-c", "/nakama/nakama migrate up --database.address $DATABASE_ADDRESS && exec /nakama/nakama --config /nakama/data/modules/nakama-config.yml --database.address $DATABASE_ADDRESS --logger.level DEBUG"]