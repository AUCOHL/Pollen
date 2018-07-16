SOURCES = Sources/*.ts

pollen.js: $(SOURCES)
	node_modules/.bin/tsc --module none --alwaysStrict Sources/main.ts --outFile $@

.PHONY: clean

clean:
	rm -f pollen.js