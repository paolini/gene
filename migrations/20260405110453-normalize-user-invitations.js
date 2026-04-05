module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    await db.collection('userinvitations').updateMany(
      {},
      [
        {
          $set: {
            isReusable: { $ifNull: ['$isReusable', false] },
            isActive: { $ifNull: ['$isActive', true] },
            lastUsedBy: { $ifNull: ['$lastUsedBy', '$usedBy'] },
            lastUsedAt: { $ifNull: ['$lastUsedAt', '$usedAt'] },
            redemptionCount: {
              $ifNull: [
                '$redemptionCount',
                {
                  $cond: [
                    { $ne: ['$usedAt', null] },
                    1,
                    0
                  ]
                }
              ]
            },
            disabledAt: { $ifNull: ['$disabledAt', null] }
          }
        }
      ]
    );
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    await db.collection('userinvitations').updateMany(
      {},
      {
        $unset: {
          isReusable: '',
          isActive: '',
          lastUsedBy: '',
          lastUsedAt: '',
          redemptionCount: '',
          disabledAt: ''
        }
      }
    );
  }
};
