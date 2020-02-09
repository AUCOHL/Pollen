SOURCES = Sources/*.ts

pollen.js: $(SOURCES)
	node_modules/.bin/tsc --module none --outFile $@

.PHONY: install, uninstall, clean

## NOTE: FAILS: Node modules are not bundled
# install: pollen.js
# 	echo '#!/usr/bin/env node' > /usr/local/bin/pollen.js
# 	cat pollen.js >> /usr/local/bin/pollen.js
# 	chmod +x /usr/local/bin/pollen.js

# uninstall:
# 	rm /usr/local/bin/pollen.js


clean:
	rm -f pollen.js