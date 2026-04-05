module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    await db.collection('userinvitations').updateMany(
      {
        isReusable: false,
        usedAt: { $ne: null },
        isActive: true
      },
      [
        {
          $set: {
            isActive: false,
            disabledAt: { $ifNull: ['$disabledAt', '$usedAt'] },
            lastUsedBy: { $ifNull: ['$lastUsedBy', '$usedBy'] },
            lastUsedAt: { $ifNull: ['$lastUsedAt', '$usedAt'] },
            redemptionCount: {
              $cond: [
                { $gt: ['$redemptionCount', 0] },
                '$redemptionCount',
                1
              ]
            }
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
      {
        isReusable: false,
        usedAt: { $ne: null },
        isActive: false
      },
      {
        $set: {
          isActive: true,
          disabledAt: null
        }
      }
    );
  }
};