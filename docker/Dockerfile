### Webapp build
FROM node:22-bookworm@sha256:7702d8aa4d5910871692af4480eb3ba86f23047a6417a44d857d06c95d060d3f AS nodebuild

WORKDIR /webapp
ADD webapp/ /webapp

ARG DISABLE_BROWSER_CONSOLE_LOGS=true
ENV DISABLE_BROWSER_CONSOLE_LOGS=${DISABLE_BROWSER_CONSOLE_LOGS}

### 'CPPFLAGS="-DPNG_ARM_NEON_OPT=0"' Needed To Avoid Bug Described in: https://github.com/imagemin/optipng-bin/issues/118#issuecomment-1019838562
### Can be Removed when Ticket will be Closed
RUN CPPFLAGS="-DPNG_ARM_NEON_OPT=0" npm install --no-optional && \
    npm run pack

### Go build
FROM golang:1.26.10-bookworm@sha256:5de7c99eb78ca5e515a4c340235d0955ec5964a5071c492c15503d7c267da473 AS gobuild

WORKDIR /go/src/focalboard
ADD . /go/src/focalboard

# Get target architecture 
ARG TARGETOS
ARG TARGETARCH  

ENV GOPROXY=https://proxy.golang.org,direct
ENV GOSUMDB=sum.golang.org

RUN EXCLUDE_PLUGIN=true EXCLUDE_SERVER=true EXCLUDE_ENTERPRISE=true make server-docker os=${TARGETOS} arch=${TARGETARCH}

## Final image
FROM debian:bookworm-slim@sha256:734a72b3d6142a71993b4bc580ca01d8ca687f77a2c422d96a961d3376b179bc

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/focalboard/data/files
RUN chown -R nobody:nogroup /opt/focalboard

WORKDIR /opt/focalboard

COPY --from=nodebuild --chown=nobody:nogroup /webapp/pack pack/
COPY --from=gobuild --chown=nobody:nogroup /go/src/focalboard/bin/docker/focalboard-server bin/
COPY --from=gobuild --chown=nobody:nogroup /go/src/focalboard/LICENSE.txt LICENSE.txt
COPY --from=gobuild --chown=nobody:nogroup /go/src/focalboard/docker/server_config.json config.json

USER nobody

EXPOSE 8000/tcp 9092/tcp

VOLUME /opt/focalboard/data

CMD ["/opt/focalboard/bin/focalboard-server"]
