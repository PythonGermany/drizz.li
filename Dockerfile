# Self-hosted build: the static site served by static-web-server, with the
# response headers from static/_headers.
#
# The build needs the git metadata (see below). A git URL context drops .git
# unless BuildKit is told to keep it:
#   docker build --build-arg BUILDKIT_CONTEXT_KEEP_GIT_DIR=1 https://github.com/PythonGermany/drizz.li.git#deploy
FROM node:26 AS build
WORKDIR /src
COPY . .
# The build version comes from the commit (vite.config.ts); SvelteKit's update
# check and the service worker's cache name depend on it
RUN git rev-parse HEAD
RUN npm ci && npm run build
RUN awk -f docker/headers.awk static/_headers >> docker/sws.toml

FROM joseluisq/static-web-server:2
COPY --from=build /src/build /public
COPY --from=build /src/docker/sws.toml /sws.toml
ENV SERVER_CONFIG_FILE=/sws.toml
