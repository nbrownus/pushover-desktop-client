all: test

test:
	rm -rf .tmp
	mkdir .tmp
	NODE_ENV=test node_modules/ppunit/bin/ppunit -Rlist

test-cov:
	rm -rf .tmp
	mkdir .tmp
	NODE_ENV=test node node_modules/istanbul/lib/cli.js --print=detail cover \
		node_modules/ppunit/bin/ppunit -- -Rlist

test-cov-html:
	rm -rf .tmp
	mkdir .tmp
	NODE_ENV=test node node_modules/istanbul/lib/cli.js --print=summary cover \
	node_modules/ppunit/bin/ppunit -- -Rlist

	@echo ""
	@echo "****************************************************************************************"
	@echo "Results: file://$$PWD/coverage/lcov-report/index.html"
	@echo "****************************************************************************************"

.PHONY: test test-cov test-cov-html