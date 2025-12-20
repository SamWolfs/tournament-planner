##
# Tournament Planner
#
# @file
# @version 1.0

.PHONY: build
build:
	npm run fetch:enrich
	npm run normalize
	npm run locations
	npm run locations:normalize
	npm run aggregate
	npm run build:web

# end
