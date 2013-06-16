// Read-only collection that monitors multiple paths
angular.module('firebase').factory('angularFireAggregate', ['$timeout', function($timeout) {
   return function(paths) {
      var collection = [];
      var indexes = {};

      function AngularFireItem(ref, index) {
         this.$ref = ref.ref();
         this.$id = ref.name();
         this.$index = index;
         angular.extend(this, {priority:ref.getPriority()}, ref.val());
      }

      function Path(collectionUrlOrRef, initialCb) {
         var pathRef, disposables = [];
         if (typeof collectionUrlOrRef == "string") {
            pathRef = new Firebase(collectionUrlOrRef);
         } else {
            pathRef = collectionUrlOrRef;
         }

         if (initialCb && typeof initialCb == 'function') {
            pathRef.once('value', initialCb);
         }

         pathRef.on('child_added', function(data, prevId) {
            $timeout(function() {
               var index = getIndex(prevId);
               addChild(index, new AngularFireItem(data, index));
               updateIndexes(index);
            });
         });

         pathRef.on('child_removed', function(data) {
            $timeout(function() {
               var id = data.name();
               var pos = indexes[id];
               removeChild(id);
               updateIndexes(pos);
            });
         });

         pathRef.on('child_changed', function(data, prevId) {
            $timeout(function() {
               var index = indexes[data.name()];
               var newIndex = getIndex(prevId);
               var item = new AngularFireItem(data, index);

               updateChild(index, item);
               if (newIndex !== index) {
                  moveChild(index, newIndex, item);
               }
            });
         });

         pathRef.on('child_moved', function(ref, prevId) {
            $timeout(function() {
               var oldIndex = indexes[ref.name()];
               var newIndex = getIndex(prevId);
               var item = collection[oldIndex];
               moveChild(oldIndex, newIndex, item);
            });
         });
      }

      function getIndex(prevId) {
         return prevId ? indexes[prevId] + 1 : 0;
      }

      function addChild(index, item) {
         indexes[item.$id] = index;
         collection.splice(index, 0, item);
      }

      function removeChild(id) {
         var index = indexes[id];
         // Remove the item from the collection.
         collection.splice(index, 1);
         indexes[id] = undefined;
      }

      function updateChild (index, item) {
         collection[index] = item;
      }

      function moveChild (from, to, item) {
         collection.splice(from, 1);
         collection.splice(to, 0, item);
         updateIndexes(from, to);
      }

      function updateIndexes(from, to) {
         var length = collection.length;
         to = to || length;
         if (to > length) {
            to = length;
         }
         for (var index = from; index < to; index++) {
            var item = collection[index];
            item.$index = indexes[item.$id] = index;
         }
      }

      collection.addPath = function(path, cb) {
         new Path(path, cb);
      };

      if( paths ) {
         for(var i = 0; i < paths.length; i++) {
            collection.addPath(paths[i]);
         }
      }

      return collection;
   };
}]);