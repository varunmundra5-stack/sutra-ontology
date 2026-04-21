FROM openpolicyagent/opa:1.15.2

# Bake policies in at build time.
# On Render, the policies directory is part of the image so no volume mount needed.
COPY policies /policies

EXPOSE 8181

ENTRYPOINT ["opa"]
CMD ["run", "--server", "--addr=0.0.0.0:8181", "--log-level=info", "/policies"]

HEALTHCHECK --interval=15s --timeout=5s --retries=6 \
  CMD wget -qO- http://localhost:8181/health || exit 1
